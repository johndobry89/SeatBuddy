import { afterEach, expect, it, vi } from 'vitest';
import { panelReplySchema, popupReplySchema } from '../../src/privacy/protocol';
import { fictionalObservation } from '../../src/fixtures/data';
import type { Sender } from '../../src/background/message-router';

type Listener = (
  message: unknown,
  sender: Sender,
  respond: (reply: unknown) => void,
) => boolean;
const panel: Sender = {
  id: 'worker-test',
  url: 'chrome-extension://worker-test/sidepanel.html',
  frameId: 0,
};
const fixture: Sender = {
  id: 'worker-test',
  url: 'chrome-extension://worker-test/fixture.html',
  frameId: 0,
  documentId: 'one',
  tab: { id: 7, windowId: 1, incognito: false },
};
const popup: Sender = {
  id: 'worker-test',
  url: 'chrome-extension://worker-test/popup.html',
  frameId: 0,
};
async function boot() {
  vi.resetModules();
  const api = {
    runtime: {
      id: 'worker-test',
      onMessage: { addListener: vi.fn<(listener: Listener) => void>() },
      onInstalled: { addListener: vi.fn<(callback: () => void) => void>() },
    },
    extension: { isAllowedIncognitoAccess: vi.fn().mockResolvedValue(false) },
    tabs: {
      query: vi.fn().mockResolvedValue([]),
      onAttached: {
        addListener: vi.fn<(callback: (tabId: number) => void) => void>(),
      },
      onReplaced: {
        addListener:
          vi.fn<(callback: (newId: number, oldId: number) => void) => void>(),
      },
      onRemoved: {
        addListener: vi.fn<(callback: (tabId: number) => void) => void>(),
      },
      onUpdated: {
        addListener:
          vi.fn<
            (
              callback: (
                tabId: number,
                change: { status?: string; url?: string },
              ) => void,
            ) => void
          >(),
      },
    },
    sidePanel: { setPanelBehavior: vi.fn().mockResolvedValue(undefined) },
  };
  vi.stubGlobal('chrome', api);
  await import('../../src/background/index');
  const handler = api.runtime.onMessage.addListener.mock.calls[0]![0];
  const send = (message: unknown, sender = panel) =>
    new Promise<unknown>((resolve) => {
      expect(handler(message, sender, resolve)).toBe(true);
    });
  return { api, send };
}
afterEach(() => vi.unstubAllGlobals());
it('wires async Chrome messages, read-only panel behavior and fail-closed browser errors', async () => {
  const { api, send } = await boot();
  api.runtime.onInstalled.addListener.mock.calls[0]![0]();
  expect(api.sidePanel.setPanelBehavior).toHaveBeenCalledWith({
    openPanelOnActionClick: false,
  });
  const reply = panelReplySchema.parse(
    await send({ type: 'DEMO', scenario: 'partial' }),
  );
  expect(reply.ok && reply.state.sessions.B.observation?.status).toBe('FAILED');
  api.extension.isAllowedIncognitoAccess.mockRejectedValueOnce(
    new Error('unavailable'),
  );
  expect(await send({ type: 'GET_STATE' })).toMatchObject({ ok: false });
});
it.each(['navigation', 'close', 'move', 'replacement'] as const)(
  'invalidates fixture evidence on Chrome %s event',
  async (event) => {
    const { api, send } = await boot();
    expect(await send({ type: 'BIND', role: 'A' }, fixture)).toEqual({
      ok: true,
    });
    expect(
      await send(
        { type: 'OBSERVE', observation: fictionalObservation('A', Date.now()) },
        fixture,
      ),
    ).toEqual({ ok: true });
    if (event === 'navigation')
      api.tabs.onUpdated.addListener.mock.calls[0]![0](7, {
        status: 'loading',
      });
    else if (event === 'close')
      api.tabs.onRemoved.addListener.mock.calls[0]![0](7);
    else if (event === 'move')
      api.tabs.onAttached.addListener.mock.calls[0]![0](7);
    else api.tabs.onReplaced.addListener.mock.calls[0]![0](8, 7);
    const reply = panelReplySchema.parse(await send({ type: 'GET_STATE' }));
    expect(reply.ok && reply.state.sessions.A.observation).toBeNull();
  },
);
it('a new worker module retains no simulation or binding and performs no action replay', async () => {
  const first = await boot();
  await first.send({ type: 'DEMO', scenario: 'partial' });
  const second = await boot();
  const reply = panelReplySchema.parse(
    await second.send({ type: 'GET_STATE' }),
  );
  expect(reply.ok && reply.state.mode).toBe('MANUAL');
  expect(reply.ok && reply.state.sessions.A.observation).toBeNull();
  expect(second.api.sidePanel.setPanelBehavior).not.toHaveBeenCalled();
});

it('reduces Chrome metadata and invalidates a context on navigation and consent revocation', async () => {
  const { api, send } = await boot();
  api.extension.isAllowedIncognitoAccess.mockResolvedValue(true);
  api.tabs.query.mockResolvedValue([
    {
      id: 7,
      windowId: 1,
      incognito: false,
      title: 'fictional-private-title',
      url: 'https://example.invalid/never-return',
    },
    {
      id: 8,
      windowId: 2,
      incognito: true,
      title: 'fictional-private-title',
      url: 'https://example.invalid/never-return',
    },
  ]);
  const snapshot = panelReplySchema.parse(await send({ type: 'GET_CONTEXTS' }));
  expect(snapshot.ok && snapshot.state.contexts).toEqual([
    { tabId: 7, windowId: 1, incognito: false },
    { tabId: 8, windowId: 2, incognito: true },
  ]);
  expect(JSON.stringify(snapshot)).not.toContain('fictional-private-title');
  expect(JSON.stringify(snapshot)).not.toContain('example.invalid');
  expect(
    await send({ type: 'BIND_CONTEXT', role: 'A', tabId: 7 }),
  ).toMatchObject({ ok: true });
  api.tabs.onUpdated.addListener.mock.calls[0]![0](7, { status: 'loading' });
  const changed = panelReplySchema.parse(await send({ type: 'GET_STATE' }));
  expect(changed.ok && changed.state.manual.tracks.A.context).toBeNull();
  expect(changed.ok && changed.state.manual.tracks.A.problem).toBe('NAVIGATED');
  expect(
    changed.ok && changed.state.contexts.some((value) => value.tabId === 7),
  ).toBe(false);
  await send({ type: 'BIND_CONTEXT', role: 'B', tabId: 8 });
  api.extension.isAllowedIncognitoAccess.mockResolvedValue(false);
  const revoked = panelReplySchema.parse(await send({ type: 'GET_STATE' }));
  expect(revoked.ok && revoked.state.manual.tracks.B.context).toBeNull();
  expect(
    revoked.ok && revoked.state.contexts.some((context) => context.incognito),
  ).toBe(false);
});

it('does not enumerate browser tabs during ordinary status polling or untrusted messages', async () => {
  const { api, send } = await boot();
  await send({ type: 'GET_STATE' });
  await send({ type: 'GET_STATE' });
  await send({ type: 'GET_CONTEXTS' }, fixture);
  expect(api.tabs.query).not.toHaveBeenCalled();
  await send({ type: 'GET_CONTEXTS' });
  expect(api.tabs.query).toHaveBeenCalledTimes(1);
});

it('a reset invalidates a command still awaiting Chrome permission instead of resurrecting old input', async () => {
  const { api, send } = await boot();
  let finish: ((allowed: boolean) => void) | undefined;
  api.extension.isAllowedIncognitoAccess.mockReturnValueOnce(
    new Promise<boolean>((resolve) => {
      finish = resolve;
    }),
  );
  const pending = send({
    type: 'PLAN',
    plan: fictionalObservation('A', Date.now()).showtime,
  });
  expect(await send({ type: 'RESET' })).toMatchObject({ ok: true });
  finish?.(false);
  expect(await pending).toMatchObject({ ok: false });
  const state = panelReplySchema.parse(await send({ type: 'GET_STATE' }));
  expect(state.ok && state.state.manual.plan).toBeNull();
});

it('an untrusted reset cannot cancel a legitimate pending panel command', async () => {
  const { api, send } = await boot();
  let finish: ((allowed: boolean) => void) | undefined;
  api.extension.isAllowedIncognitoAccess.mockReturnValueOnce(
    new Promise<boolean>((resolve) => {
      finish = resolve;
    }),
  );
  const pending = send({
    type: 'PLAN',
    plan: fictionalObservation('A', Date.now()).showtime,
  });
  expect(await send({ type: 'RESET' }, fixture)).toMatchObject({ ok: false });
  finish?.(false);
  expect(await pending).toMatchObject({ ok: true });
});

it('a delayed context query cannot repopulate cleared choices after reset', async () => {
  const { api, send } = await boot();
  let finish: ((tabs: unknown[]) => void) | undefined;
  api.tabs.query.mockReturnValueOnce(
    new Promise<unknown[]>((resolve) => {
      finish = resolve;
    }),
  );
  const pending = send({ type: 'GET_CONTEXTS' });
  await vi.waitFor(() => expect(api.tabs.query).toHaveBeenCalledTimes(1));
  await send({ type: 'RESET' });
  finish?.([{ id: 7, windowId: 1, incognito: false }]);
  expect(await pending).toMatchObject({ ok: false });
  const state = panelReplySchema.parse(await send({ type: 'GET_STATE' }));
  expect(state.ok && state.state.contexts).toEqual([]);
});

it('rejects an in-flight popup mutation after reset without enumerating tabs', async () => {
  const { api, send } = await boot();
  const initial = popupReplySchema.parse(
    await send({ type: 'BUDDY_READ' }, popup),
  );
  if (!initial.ok) throw new Error(initial.error);
  let finish: ((allowed: boolean) => void) | undefined;
  api.extension.isAllowedIncognitoAccess.mockReturnValueOnce(
    new Promise<boolean>((resolve) => {
      finish = resolve;
    }),
  );
  const mutation = {
    type: 'BUDDY_MUTATE',
    generation: initial.buddy.generation,
    revision: initial.buddy.revision,
    action: { kind: 'ADD', nickname: 'Filmmaatje' },
    resetB: false,
  };
  const pending = send(mutation, popup);
  await send({ type: 'RESET' });
  finish?.(false);
  expect(await pending).toMatchObject({ ok: false });
  expect(await send(mutation, popup)).toMatchObject({
    ok: false,
    code: 'STALE_BUDDY',
  });
  const current = popupReplySchema.parse(
    await send({ type: 'BUDDY_READ' }, popup),
  );
  expect(current.ok && current.buddy.roster).toEqual([]);
  expect(api.tabs.query).not.toHaveBeenCalled();
});

it('a new worker refuses an old popup generation instead of restoring its roster', async () => {
  const old = await boot();
  const initial = popupReplySchema.parse(
    await old.send({ type: 'BUDDY_READ' }, popup),
  );
  if (!initial.ok) throw new Error(initial.error);
  const next = await boot();
  expect(
    await next.send(
      {
        type: 'BUDDY_MUTATE',
        generation: initial.buddy.generation,
        revision: initial.buddy.revision,
        action: { kind: 'ADD', nickname: 'Filmmaatje' },
        resetB: false,
      },
      popup,
    ),
  ).toMatchObject({ ok: false, code: 'STALE_BUDDY' });
});
