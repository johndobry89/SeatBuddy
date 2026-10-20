import { afterEach, expect, it, vi } from 'vitest';
import { panelReplySchema } from '../../src/privacy/protocol';
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
    openPanelOnActionClick: true,
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
