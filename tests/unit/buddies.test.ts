import { expect, it } from 'vitest';
import { Coordinator } from '../../src/background/coordinator';
import { routeMessage, type Sender } from '../../src/background/message-router';
import {
  buddyMutationSchema,
  nicknameSchema,
  selectedBuddy,
  type BuddyAction,
} from '../../src/core/buddies';
import {
  fixtureBuddyReplySchema,
  popupReplySchema,
} from '../../src/privacy/protocol';
import { fictionalObservation } from '../../src/fixtures/data';
import { manualSteps } from '../../src/core/manual-assistant';
const id = 'buddies-test';
const popup: Sender = {
  id,
  url: `chrome-extension://${id}/popup.html`,
  frameId: 0,
};
const fixture: Sender = {
  id,
  url: `chrome-extension://${id}/fixture.html`,
  frameId: 0,
  documentId: 'fictional-document',
  tab: { id: 7, windowId: 1, incognito: false },
};
const now = 1_000_000;
function command(c: Coordinator, action: BuddyAction, resetB = true) {
  return buddyMutationSchema.parse({
    type: 'BUDDY_MUTATE',
    generation: c.generation,
    revision: c.buddy.revision,
    resetB,
    action,
  });
}
function send(c: Coordinator, action: BuddyAction, resetB = true) {
  return routeMessage(c, command(c, action, resetB), popup, id, false, now);
}
function populated() {
  const c = new Coordinator();
  expect(send(c, { kind: 'DEMO' }).ok).toBe(true);
  return c;
}
it('starts empty, adds/renames/removes optional nicknames and keeps exactly one selection', () => {
  const c = new Coordinator();
  expect(c.buddy.roster).toEqual([]);
  expect(send(c, { kind: 'ADD', nickname: '  Filmmaatje  ' }).ok).toBe(true);
  expect(c.buddy.roster[0]?.nickname).toBe('Filmmaatje');
  const first = c.buddy.roster[0]!.id;
  send(c, { kind: 'ADD', nickname: 'Avondbuddy' });
  const second = c.buddy.roster[1]!.id;
  send(c, { kind: 'SELECT', id: first });
  send(c, { kind: 'SELECT', id: second });
  expect(c.buddy.selectedId).toBe(second);
  expect(selectedBuddy(c.buddy)?.nickname).toBe('Avondbuddy');
  send(c, { kind: 'RENAME', id: second, nickname: 'Filmgenoot' });
  expect(selectedBuddy(c.buddy)?.nickname).toBe('Filmgenoot');
  send(c, { kind: 'REMOVE', id: first });
  expect(c.buddy.selectedId).toBe(second);
  send(c, { kind: 'REMOVE', id: second });
  expect(c.buddy.roster).toEqual([]);
  expect(c.buddy.selectedId).toBeNull();
});
it.each([
  '',
  ' ',
  'a'.repeat(25),
  'fictief@invalid.test',
  '<img src=x>',
  '123456789',
  'Pas123456',
  'https://example.invalid',
  'Film\u0000maat',
  'Film\u202Ebuddy',
])('rejects inappropriate nickname data: %j', (nickname) => {
  expect(nicknameSchema.safeParse(nickname).success).toBe(false);
});
it('normalizes display text without creating HTML or verified identities', () => {
  expect(nicknameSchema.parse('  Ｆilm maat-2  ')).toBe('Film maat-2');
  const c = populated();
  expect(c.buddy.roster.every((buddy) => buddy.demo)).toBe(true);
  expect(c.buddy.selectedId).toBeNull();
  expect(send(c, { kind: 'ADD', nickname: 'sanne' }).ok).toBe(false);
  expect(JSON.stringify(c.buddy)).not.toContain('CONFIRMED');
});
it('bounds roster size, rejects unknown IDs and never overwrites demo state', () => {
  const c = new Coordinator();
  for (let i = 0; i < 12; i++)
    expect(send(c, { kind: 'ADD', nickname: `Buddy ${i}` }).ok).toBe(true);
  expect(send(c, { kind: 'ADD', nickname: 'Extra buddy' }).ok).toBe(false);
  expect(send(c, { kind: 'DEMO' }).ok).toBe(false);
  for (const kind of ['SELECT', 'REMOVE'] as const)
    expect(send(c, { kind, id: crypto.randomUUID() }).ok).toBe(false);
});
it.each(['SELECT', 'REMOVE', 'RENAME', 'CLEAR'] as const)(
  'requires deliberate active-buddy %s and clears B alone',
  (kind) => {
    const c = populated();
    const first = c.buddy.roster[0]!.id;
    const second = c.buddy.roster[1]!.id;
    send(c, { kind: 'SELECT', id: first });
    const plan = fictionalObservation('A', now).showtime;
    c.manualCommand({ type: 'PLAN', plan }, now, [], true);
    for (const role of ['A', 'B'] as const) {
      c.manualCommand(
        {
          type: 'MANUAL_DETAILS',
          role,
          showtime: plan,
          seat: { row: 'F', number: role === 'A' ? '10' : '11' },
        },
        now,
        [],
        true,
      );
      for (const step of manualSteps)
        c.manualCommand({ type: 'ACKNOWLEDGE', role, step }, now, [], true);
    }
    c.manual.tracks.B.context = { tabId: 99, windowId: 2, incognito: true };
    c.demo('partial', now);
    const A = structuredClone(c.manual.tracks.A);
    const simA = structuredClone(c.sessions.A);
    const action: BuddyAction =
      kind === 'CLEAR'
        ? { kind }
        : kind === 'SELECT'
          ? { kind, id: second }
          : kind === 'RENAME'
            ? { kind, id: first, nickname: 'Nieuwe buddy' }
            : { kind, id: first };
    expect(send(c, action, false)).toMatchObject({
      ok: false,
      code: 'BUDDY_REVIEW',
    });
    expect(c.manual.tracks.B.completed).toHaveLength(5);
    expect(send(c, action, true).ok).toBe(true);
    expect(c.manual.tracks.A).toEqual(A);
    expect(c.sessions.A).toEqual(simA);
    expect(c.manual.tracks.B).toMatchObject({
      context: null,
      reportedShowtime: null,
      completed: [],
      seat: { row: '', number: '' },
      problem: 'BUDDY_CHANGED',
    });
    expect(c.sessions.B.observation).toBeNull();
    expect(c.snapshot(now, true).match).toBe('UNKNOWN');
  },
);
it('rejects replay, post-reset delayed commands and old generations without repopulating a new worker', () => {
  const c = populated();
  const message = command(c, { kind: 'ADD', nickname: 'Nieuw maatje' });
  expect(c.buddyCommand(message).ok).toBe(true);
  expect(c.buddyCommand(message)).toMatchObject({
    ok: false,
    code: 'STALE_BUDDY',
  });
  const delayed = command(c, { kind: 'SELECT', id: c.buddy.roster[0]!.id });
  c.reset();
  expect(c.buddyCommand(delayed).ok).toBe(false);
  const next = new Coordinator();
  expect(next.buddyCommand(message).ok).toBe(false);
  expect(next.buddy.roster).toEqual([]);
});
it('popup can only read or change nicknames, never query/bind contexts or receive A/B/incognito state', () => {
  const c = populated();
  c.manual.plan = fictionalObservation('A', now).showtime;
  c.manual.tracks.B.context = {
    tabId: 773388,
    windowId: 887711,
    incognito: true,
  };
  for (const raw of [
    { type: 'GET_STATE' },
    { type: 'GET_CONTEXTS' },
    { type: 'RESET' },
    { type: 'BIND_CONTEXT', role: 'B', tabId: 773388 },
  ])
    expect(routeMessage(c, raw, popup, id, true, now).ok).toBe(false);
  const reply = popupReplySchema.parse(
    routeMessage(c, { type: 'BUDDY_READ' }, popup, id, true, now),
  );
  expect(reply.ok).toBe(true);
  for (const forbidden of [
    '773388',
    '887711',
    'incognito',
    'De maan van papier',
    'tracks',
    'manual',
    'contexts',
  ])
    expect(JSON.stringify(reply)).not.toContain(forbidden);
  for (const sender of [
    { ...popup, id: 'foreign' },
    { ...popup, frameId: 1 },
    { ...popup, url: popup.url + '?spoof=1' },
    fixture,
  ])
    expect(
      routeMessage(c, command(c, { kind: 'CLEAR' }), sender, id, true, now).ok,
    ).toBe(false);
});
it('fictional widget reads only the selected display label, never roster, IDs or peer observations', () => {
  const c = populated();
  send(c, { kind: 'SELECT', id: c.buddy.roster[0]!.id });
  const reply = fixtureBuddyReplySchema.parse(
    routeMessage(c, { type: 'GET_BUDDY' }, fixture, id, false, now),
  );
  expect(reply).toEqual({ ok: true, buddy: { nickname: 'Sanne', demo: true } });
  expect(JSON.stringify(reply)).not.toContain('Mark');
  expect(JSON.stringify(reply)).not.toContain(c.buddy.selectedId);
});
