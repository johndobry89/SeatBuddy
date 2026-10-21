import { workflow } from '../helpers/workflow';
import { afterEach, expect, it, vi } from 'vitest';
import { useCompanion } from '../../src/sidepanel/use-companion';
import { Coordinator } from '../../src/background/coordinator';
import { fictionalObservation } from '../../src/fixtures/data';
import { routeMessage } from '../../src/background/message-router';
const plan = fictionalObservation('A', Date.now()).showtime;
const panel = {
  id: 'test',
  url: 'chrome-extension://test/sidepanel.html',
  frameId: 0,
};
function runtime(c: Coordinator) {
  const sendMessage = vi.fn(async (message: unknown) =>
    routeMessage(c, message, panel, 'test', false, Date.now()),
  );
  vi.stubGlobal('chrome', { runtime: { sendMessage } });
  return sendMessage;
}
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
it('detects a new worker generation and discards claims without replaying a plan or acknowledgement', async () => {
  const old = new Coordinator();
  const send = runtime(old);
  const ui = useCompanion();
  await ui.command({ type: 'GET_STATE' });
  await ui.command({ type: 'PLAN', plan });
  await ui.command({
    type: 'MANUAL_DETAILS',
    role: 'A',
    showtime: plan,
    seat: { row: 'F', number: '10' },
  });
  await ui.command({ type: 'REVIEW_PLAN' });
  await ui.command({ type: 'ACKNOWLEDGE', role: 'A', step: 'ACCOUNT' });
  expect(ui.snapshot.value?.manual.tracks.A.completed).toEqual(['ACCOUNT']);
  const fresh = new Coordinator();
  send.mockImplementation(async (message) =>
    routeMessage(fresh, message, panel, 'test', false, Date.now()),
  );
  await ui.command({ type: 'GET_STATE' });
  expect(ui.snapshot.value?.manual.plan).toBeNull();
  expect(ui.lifecycleNotice.value).toContain('opnieuw gestart');
  const sent = send.mock.calls.map(([message]) => message);
  expect(sent[0]).toEqual({ type: 'GET_STATE' });
  expect(
    sent
      .slice(1, -1)
      .map((value) => (value as ReturnType<typeof workflow>).command.type),
  ).toEqual(['PLAN', 'MANUAL_DETAILS', 'REVIEW_PLAN', 'ACKNOWLEDGE']);
  expect(sent.at(-1)).toEqual({ type: 'GET_STATE' });
  expect(send.mock.calls).toHaveLength(6); // No mutation replay after generation replacement.
});
it('recovers only after explicit reset, never merges offline progress or retries the failed command', async () => {
  const worker = new Coordinator();
  const send = runtime(worker);
  const ui = useCompanion();
  await ui.command({ type: 'GET_STATE' });
  await ui.command({ type: 'PLAN', plan });
  send.mockRejectedValueOnce(new Error('Fictional transport loss'));
  await ui.command({ type: 'ACKNOWLEDGE', role: 'A', step: 'ACCOUNT' });
  expect(ui.offline.value).toBe(true);
  expect(ui.snapshot.value?.manual.plan).toBeNull();
  await ui.command({
    type: 'PLAN',
    plan: { ...plan, movie: 'Lokaal fictief plan' },
  });
  const before = send.mock.calls.length;
  send.mockRejectedValueOnce(new Error('Still offline'));
  expect(await ui.reconnect()).toBe(false);
  expect(ui.snapshot.value?.manual.plan?.movie).toBe('Lokaal fictief plan');
  expect(await ui.reconnect()).toBe(true);
  expect(ui.offline.value).toBe(false);
  expect(ui.snapshot.value?.manual.plan).toBeNull();
  expect(worker.manual.plan).toBeNull();
  expect(send.mock.calls.slice(before).map(([message]) => message)).toEqual([
    { type: 'RESET' },
    { type: 'RESET' },
  ]);
});
it('bounds hung messages, releases busy UI and ignores a late success', async () => {
  vi.useFakeTimers();
  const worker = new Coordinator();
  const send = runtime(worker);
  const ui = useCompanion();
  await ui.command({ type: 'GET_STATE' });
  let resolve: ((value: ReturnType<typeof routeMessage>) => void) | undefined;
  send.mockImplementationOnce(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  const pending = ui.command({ type: 'PLAN', plan });
  expect(await ui.command({ type: 'GET_STATE' })).toBe(false);
  await vi.advanceTimersByTimeAsync(4000);
  expect(await pending).toBe(false);
  expect(ui.busy.value).toBe(false);
  expect(ui.offline.value).toBe(true);
  resolve?.(
    routeMessage(
      worker,
      { type: 'PLAN', plan },
      panel,
      'test',
      false,
      Date.now(),
    ),
  );
  await Promise.resolve();
  expect(ui.snapshot.value?.manual.plan).toBeNull();
  expect(await ui.reconnect()).toBe(true);
  expect(worker.manual.plan).toBeNull();
});
it('fails closed on malformed replies and keeps local planning usable without Chrome', async () => {
  vi.stubGlobal('chrome', {
    runtime: {
      sendMessage: async () => ({ ok: true, state: { confirmed: true } }),
    },
  });
  const ui = useCompanion();
  expect(await ui.command({ type: 'GET_STATE' })).toBe(false);
  expect(ui.offline.value).toBe(true);
  expect(await ui.command({ type: 'PLAN', plan })).toBe(true);
  expect(ui.snapshot.value?.manual.plan).toEqual(plan);
  expect(await ui.command({ type: 'GET_CONTEXTS' })).toBe(false);
});
