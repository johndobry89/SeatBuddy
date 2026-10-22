import { manualCommandSchema } from '../../src/core/manual-assistant';
import type { Snapshot } from '../../src/background/coordinator';
import { afterEach, expect, it, vi } from 'vitest';
import { panelReplySchema, popupReplySchema } from '../../src/privacy/protocol';
import { fictionalObservation } from '../../src/fixtures/data';
import type { Sender } from '../../src/background/message-router';
import type { StoragePort } from '../../src/background/retained-data';
import { memoryStorage } from '../helpers/storage';

type Listener = (
  message: unknown,
  sender: Sender,
  respond: (reply: unknown) => void,
) => boolean;
const panel: Sender = {
  id: 'worker-test',
  url: 'chrome-extension://worker-test/sidepanel.html',
  documentId: 'panel-doc',
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
  documentId: 'popup-doc',
  frameId: 0,
};
async function boot(storage?: StoragePort) {
  vi.resetModules();
  const api = {
    storage,
    runtime: {
      id: 'worker-test',
      getContexts: vi
        .fn()
        .mockImplementation(
          async ({ documentIds }: { documentIds: string[] }) => [
            {
              documentId: documentIds[0],
              documentUrl:
                documentIds[0] === 'popup-doc' ? popup.url : panel.url,
              contextType:
                documentIds[0] === 'popup-doc' ? 'POPUP' : 'SIDE_PANEL',
              frameId: 0,
              windowId: 1,
              incognito: false,
            },
          ],
        ),
      onMessage: { addListener: vi.fn<(listener: Listener) => void>() },
      onInstalled: { addListener: vi.fn<(callback: () => void) => void>() },
    },
    windows: {
      get: vi
        .fn()
        .mockImplementation(async (id: number) => ({ id, incognito: false })),
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
  let current: Snapshot | null = null;
  const send = (input: unknown, sender = panel) => {
    const parsed = manualCommandSchema.safeParse(input);
    const message =
      parsed.success && sender === panel && current
        ? {
            type: 'WORKFLOW',
            generation: current.generation,
            revision: current.manual.revision,
            buddyEpoch: current.buddyEpoch,
            command: parsed.data,
          }
        : input;
    return new Promise<unknown>((resolve) => {
      expect(
        handler(message, sender, (reply) => {
          const parsedReply = panelReplySchema.safeParse(reply);
          if (parsedReply.success && parsedReply.data.ok)
            current = parsedReply.data.state;
          resolve(reply);
        }),
      ).toBe(true);
    });
  };
  return { api, send };
}
afterEach(() => vi.unstubAllGlobals());
it('rejects incognito, unknown, mismatched-document and lying-window contexts before storage or shared mutation', async () => {
  for (const kind of ['incognito', 'missing', 'document', 'window'] as const) {
    const storage = memoryStorage();
    const { api, send } = await boot(storage);
    if (kind === 'missing') api.runtime.getContexts.mockResolvedValue([]);
    if (kind === 'incognito')
      api.runtime.getContexts.mockResolvedValue([
        {
          documentId: 'panel-doc',
          documentUrl: panel.url,
          contextType: 'SIDE_PANEL',
          frameId: 0,
          windowId: 1,
          incognito: true,
        },
      ]);
    if (kind === 'document')
      api.runtime.getContexts.mockResolvedValue([
        {
          documentId: 'other',
          documentUrl: panel.url,
          contextType: 'SIDE_PANEL',
          frameId: 0,
          windowId: 1,
          incognito: false,
        },
      ]);
    if (kind === 'window')
      api.windows.get.mockResolvedValue({ id: 1, incognito: true });
    expect(await send({ type: 'GET_STATE' })).toMatchObject({
      ok: false,
      code: 'BROWSER_UNAVAILABLE',
    });
    expect(api.extension.isAllowedIncognitoAccess).not.toHaveBeenCalled();
    expect(storage.local.calls).toEqual([]);
    expect(storage.session.calls).toEqual([]);
  }
});
it('popup and fixture cannot write a film draft through an otherwise valid storage command', async () => {
  const { send } = await boot();
  for (const sender of [popup, fixture])
    expect(
      await send(
        {
          type: 'DRAFT_SAVE',
          generation: crypto.randomUUID(),
          revision: 0,
          plan: fictionalObservation('A', Date.now()).showtime,
        },
        sender,
      ),
    ).toMatchObject({ ok: false });
});
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
  if (!changed.ok) throw new Error(changed.error);
  await send({ type: 'PLANNING_MODE', mode: 'TOGETHER', resetB: false });
  expect(
    await send({ type: 'BIND_CONTEXT', role: 'B', tabId: 8 }),
  ).toMatchObject({ ok: true });
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
  await send({ type: 'GET_STATE' });
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
  await send({ type: 'GET_STATE' });
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
  await send({ type: 'GET_STATE' });
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

it('a selected buddy change rejects pending acknowledgements requiring old review while preserving A’s earlier check', async () => {
  const { api, send } = await boot();
  await send({ type: 'GET_STATE' });
  await send({
    type: 'PLAN',
    plan: fictionalObservation('A', Date.now()).showtime,
  });
  const buddy = popupReplySchema.parse(
    await send({ type: 'BUDDY_READ' }, popup),
  );
  if (!buddy.ok) throw new Error(buddy.error);
  await send(
    {
      type: 'BUDDY_MUTATE',
      generation: buddy.buddy.generation,
      revision: buddy.buddy.revision,
      action: { kind: 'DEMO' },
      resetB: false,
    },
    popup,
  );
  const roster = popupReplySchema.parse(
    await send({ type: 'BUDDY_READ' }, popup),
  );
  if (!roster.ok) throw new Error(roster.error);
  await send({ type: 'PLANNING_MODE', mode: 'TOGETHER', resetB: false });
  const fakePlan = fictionalObservation('A', Date.now()).showtime;
  for (const role of ['A', 'B'] as const)
    await send({
      type: 'MANUAL_DETAILS',
      role,
      showtime: fakePlan,
      seat: { row: 'F', number: role === 'A' ? '10' : '11' },
    });
  await send({ type: 'REVIEW_PLAN' });
  expect(
    await send({ type: 'ACKNOWLEDGE', role: 'A', step: 'ACCOUNT' }),
  ).toMatchObject({ ok: true });
  const state = panelReplySchema.parse(await send({ type: 'GET_STATE' }));
  if (!state.ok) throw new Error(state.error);
  let finishA: ((allowed: boolean) => void) | undefined;
  let finishB: ((allowed: boolean) => void) | undefined;
  api.extension.isAllowedIncognitoAccess.mockReturnValueOnce(
    new Promise<boolean>((done) => {
      finishB = done;
    }),
  );
  const B = send({
    type: 'WORKFLOW',
    revision: state.state.manual.revision,
    generation: state.state.generation,
    buddyEpoch: state.state.buddyEpoch,
    command: { type: 'ACKNOWLEDGE', role: 'B', step: 'ACCOUNT' },
  });
  api.extension.isAllowedIncognitoAccess.mockReturnValueOnce(
    new Promise<boolean>((done) => {
      finishA = done;
    }),
  );
  const A = send({ type: 'ACKNOWLEDGE', role: 'A', step: 'SHOWTIME' });
  await send(
    {
      type: 'BUDDY_MUTATE',
      generation: roster.buddy.generation,
      revision: roster.buddy.revision,
      action: { kind: 'SELECT', id: roster.buddy.roster[0]!.id },
      resetB: true,
    },
    popup,
  );
  finishB?.(false);
  finishA?.(false);
  expect(await B).toMatchObject({ ok: false });
  expect(await A).toMatchObject({ ok: false, code: 'STALE_WORKFLOW' });
  const current = panelReplySchema.parse(await send({ type: 'GET_STATE' }));
  expect(current.ok && current.state.manual.tracks.B.completed).toEqual([]);
  expect(current.ok && current.state.manual.tracks.A.completed).toEqual([
    'ACCOUNT',
  ]);
});

it('serializes two equal workflow revisions: one mode toggle succeeds and its duplicate cannot reset B again', async () => {
  const { send } = await boot(memoryStorage());
  const initial = panelReplySchema.parse(await send({ type: 'GET_STATE' }));
  if (!initial.ok) throw new Error(initial.error);
  const command = {
    type: 'WORKFLOW',
    generation: initial.state.generation,
    revision: initial.state.manual.revision,
    buddyEpoch: initial.state.buddyEpoch,
    command: { type: 'PLANNING_MODE', mode: 'TOGETHER', resetB: false },
  };
  const [first, second] = await Promise.all([send(command), send(command)]);
  expect(first).toMatchObject({ ok: true });
  expect(second).toMatchObject({ ok: false, code: 'STALE_WORKFLOW' });
  const current = panelReplySchema.parse(await send({ type: 'GET_STATE' }));
  expect(current.ok && current.state.manual.planningMode).toBe('TOGETHER');
  expect(current.ok && current.state.manual.review).toBeNull();
});

it('a B edit delayed in Chrome cannot revive after mode off/on and popup cannot send the workflow envelope', async () => {
  const { api, send } = await boot(memoryStorage());
  await send({ type: 'GET_STATE' });
  await send({ type: 'PLANNING_MODE', mode: 'TOGETHER', resetB: false });
  await send({
    type: 'PLAN',
    plan: fictionalObservation('A', Date.now()).showtime,
  });
  const before = panelReplySchema.parse(await send({ type: 'GET_STATE' }));
  if (!before.ok) throw new Error(before.error);
  let finish: ((allowed: boolean) => void) | undefined;
  api.extension.isAllowedIncognitoAccess.mockReturnValueOnce(
    new Promise<boolean>((resolve) => {
      finish = resolve;
    }),
  );
  const pending = send({
    type: 'MANUAL_DETAILS',
    role: 'B',
    showtime: before.state.manual.plan,
    seat: { row: 'X', number: '99' },
  });
  await send({ type: 'PLANNING_MODE', mode: 'SOLO', resetB: true });
  await send({ type: 'PLANNING_MODE', mode: 'TOGETHER', resetB: false });
  finish?.(false);
  expect(await pending).toMatchObject({ ok: false });
  const current = panelReplySchema.parse(await send({ type: 'GET_STATE' }));
  expect(current.ok && current.state.manual.tracks.B.seat).toEqual({
    row: '',
    number: '',
  });
  const calls = api.extension.isAllowedIncognitoAccess.mock.calls.length;
  expect(
    await send(
      {
        type: 'WORKFLOW',
        generation: before.state.generation,
        revision: before.state.manual.revision,
        buddyEpoch: before.state.buddyEpoch,
        command: { type: 'PLANNING_MODE', mode: 'TOGETHER', resetB: false },
      },
      popup,
    ),
  ).toMatchObject({ ok: false });
  expect(api.extension.isAllowedIncognitoAccess).toHaveBeenCalledTimes(calls);
});

it('refuses a concept expiring during a pending Chrome storage read at the actual worker boundary', async () => {
  let time = 1_000_000;
  const clock = vi.spyOn(Date, 'now').mockImplementation(() => time);
  try {
    const storage = memoryStorage();
    const { DRAFT_KEY, DRAFT_TTL_MS } =
      await import('../../src/core/retained-data');
    storage.session.values[DRAFT_KEY] = {
      version: 1,
      createdAt: time,
      plan: fictionalObservation('A', time).showtime,
    };
    const { send } = await boot(storage);
    const initial = panelReplySchema.parse(await send({ type: 'GET_STATE' }));
    if (!initial.ok) throw new Error(initial.error);
    let release!: () => void;
    const get = storage.session.get.bind(storage.session);
    vi.spyOn(storage.session, 'get').mockImplementationOnce(async (key) => {
      const value = await get(key);
      await new Promise<void>((done) => {
        release = done;
      });
      return value;
    });
    const pending = send({
      type: 'DRAFT_RESTORE',
      generation: initial.state.generation,
      revision: initial.state.buddy.revision,
    });
    await vi.waitFor(() => expect(release).toBeTypeOf('function'));
    time += DRAFT_TTL_MS;
    release();
    const result = await pending;
    expect(result).toMatchObject({ ok: false });
    expect(result).not.toHaveProperty('restoredDraft');
    expect(storage.session.values[DRAFT_KEY]).toBeUndefined();
  } finally {
    clock.mockRestore();
  }
});

it.each(['expired', 'backwards'] as const)(
  'does not acknowledge a draft save after a %s clock transition during storage',
  async (transition) => {
    let time = 1_000_000;
    const clock = vi.spyOn(Date, 'now').mockImplementation(() => time);
    try {
      const storage = memoryStorage();
      const { DRAFT_KEY, DRAFT_TTL_MS } =
        await import('../../src/core/retained-data');
      const { send } = await boot(storage);
      const initial = panelReplySchema.parse(await send({ type: 'GET_STATE' }));
      if (!initial.ok) throw new Error(initial.error);
      let release!: () => void;
      const set = storage.session.set.bind(storage.session);
      vi.spyOn(storage.session, 'set').mockImplementationOnce(async (items) => {
        await new Promise<void>((done) => {
          release = done;
        });
        await set(items);
      });
      const pending = send({
        type: 'DRAFT_SAVE',
        generation: initial.state.generation,
        revision: initial.state.buddy.revision,
        plan: fictionalObservation('A', time).showtime,
      });
      await vi.waitFor(() => expect(release).toBeTypeOf('function'));
      time += transition === 'expired' ? DRAFT_TTL_MS : -1;
      release();
      expect(await pending).toMatchObject({ ok: false });
      expect(storage.session.values[DRAFT_KEY]).toBeUndefined();
    } finally {
      clock.mockRestore();
    }
  },
);
