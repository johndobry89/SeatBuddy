import { beforeEach, describe, expect, it } from 'vitest';
import { Coordinator } from '../../src/background/coordinator';
import { routeMessage, type Sender } from '../../src/background/message-router';
import {
  bindSession,
  boundRole,
  invalidateTab,
} from '../../src/background/session-registry';
import { emptySessions, MAX_AGE_MS } from '../../src/core/types';
import { fictionalObservation } from '../../src/fixtures/data';
import {
  boundedPayload,
  fixtureCommandSchema,
} from '../../src/privacy/protocol';

const id = 'test-extension';
const now = 100_000;
const A: Sender = {
  id,
  url: `chrome-extension://${id}/fixture.html`,
  frameId: 0,
  documentId: 'doc-a',
  tab: { id: 11, windowId: 1, incognito: false },
};
const B: Sender = {
  id,
  url: `chrome-extension://${id}/fixture.html`,
  frameId: 0,
  documentId: 'doc-b',
  tab: { id: 12, windowId: 2, incognito: true },
};
const panel: Sender = {
  id,
  url: `chrome-extension://${id}/sidepanel.html`,
  frameId: 0,
};
let c: Coordinator;
function send(raw: unknown, sender = A, allowed = true, time = now) {
  return routeMessage(c, raw, sender, id, allowed, time);
}
function bindBoth() {
  expect(send({ type: 'BIND', role: 'A' }).ok).toBe(true);
  expect(send({ type: 'BIND', role: 'B' }, B).ok).toBe(true);
}
beforeEach(() => {
  c = new Coordinator();
});
describe('runtime schemas and bounded privacy payloads', () => {
  it.each([
    null,
    [],
    'hello',
    { type: 'OBSERVE' },
    { type: 'BIND', role: 'C' },
    { type: 'BIND', role: 'A', tabId: 12 },
    { type: 'BIND', role: 'A', token: 'fictional' },
  ])('rejects malformed or overbroad payload %j', (raw) =>
    expect(send(raw).ok).toBe(false),
  );
  it('rejects unknown/live confirmation and live evidence fields', () => {
    const observation = fictionalObservation('A', now);
    expect(
      send({
        type: 'OBSERVE',
        observation: { ...observation, status: 'CONFIRMED' },
      }).ok,
    ).toBe(false);
    expect(
      fixtureCommandSchema.safeParse({
        type: 'OBSERVE',
        observation: { ...observation, evidence: 'LIVE' },
      }).success,
    ).toBe(false);
  });
  it('rejects excessive and cyclic payloads', () => {
    expect(boundedPayload('x'.repeat(2049))).toBe(false);
    const cyclic: { ref?: unknown } = {};
    cyclic.ref = cyclic;
    expect(boundedPayload(cyclic)).toBe(false);
  });
});
describe('sender-bound fixture observations', () => {
  it('accepts independently bound browser-provenanced mock observations without leaking peer state', () => {
    bindBoth();
    expect(
      send({ type: 'OBSERVE', observation: fictionalObservation('A', now) }),
    ).toEqual({ ok: true });
    expect(
      send({ type: 'OBSERVE', observation: fictionalObservation('B', now) }, B),
    ).toEqual({ ok: true });
    const reply = send({ type: 'GET_STATE' }, panel);
    expect(reply.ok && 'state' in reply && reply.state.match).toBe('MATCH');
  });
  it.each([
    { id: 'foreign' },
    { url: 'https://unknown.example/fixture.html' },
    { frameId: 1 },
    { documentId: undefined },
    { tab: undefined },
    { url: `chrome-extension://${id}/fixture.html?spoof=1` },
  ])('rejects untrusted sender metadata %j', (change) => {
    bindBoth();
    expect(
      send(
        { type: 'OBSERVE', observation: fictionalObservation('A', now) },
        { ...A, ...change },
      ).ok,
    ).toBe(false);
  });
  it('rejects unbound tab, swapped document, window and context', () => {
    bindBoth();
    for (const sender of [
      { ...A, tab: { ...A.tab!, id: 99 } },
      { ...A, documentId: 'replacement' },
      { ...A, tab: { ...A.tab!, windowId: 10 } },
      { ...A, tab: { ...A.tab!, incognito: true } },
    ])
      expect(
        send(
          { type: 'OBSERVE', observation: fictionalObservation('A', now) },
          sender,
        ).ok,
      ).toBe(false);
  });
  it('rejects role swaps and absent/revoked incognito consent', () => {
    expect(send({ type: 'BIND', role: 'B' }, A).ok).toBe(false);
    expect(send({ type: 'BIND', role: 'A' }, B).ok).toBe(false);
    expect(send({ type: 'BIND', role: 'B' }, B, false).ok).toBe(false);
    bindBoth();
    send({ type: 'OBSERVE', observation: fictionalObservation('B', now) }, B);
    expect(c.snapshot(now, false).sessions.B.binding).toBeNull();
    expect(
      send(
        { type: 'OBSERVE', observation: fictionalObservation('B', now + 1) },
        B,
        false,
      ).ok,
    ).toBe(false);
  });
  it('rejects stale, future and replayed observations and clears uncertain status', () => {
    bindBoth();
    expect(
      send({ type: 'OBSERVE', observation: fictionalObservation('A', now) }).ok,
    ).toBe(true);
    expect(
      send({ type: 'OBSERVE', observation: fictionalObservation('A', now) }).ok,
    ).toBe(false);
    expect(c.sessions.A.observation).toBeNull();
    expect(
      send({ type: 'OBSERVE', observation: fictionalObservation('A', now) }).ok,
    ).toBe(false);
    for (const time of [now - MAX_AGE_MS, now + 1])
      expect(
        send({ type: 'OBSERVE', observation: fictionalObservation('A', time) })
          .ok,
      ).toBe(false);
  });
  it('rebinds/navigation invalidate status and old document cannot update new binding', () => {
    bindBoth();
    send({ type: 'OBSERVE', observation: fictionalObservation('A', now) });
    invalidateTab(c.sessions, 11);
    expect(c.sessions.A.observation).toBeNull();
    expect(
      send({ type: 'OBSERVE', observation: fictionalObservation('A', now + 1) })
        .ok,
    ).toBe(false);
    const replaced = { ...A, documentId: 'new-doc' };
    expect(send({ type: 'BIND', role: 'A' }, replaced).ok).toBe(true);
    expect(
      send({ type: 'OBSERVE', observation: fictionalObservation('A', now + 1) })
        .ok,
    ).toBe(false);
  });
  it('malformed observation invalidates previously accepted state', () => {
    bindBoth();
    send({ type: 'OBSERVE', observation: fictionalObservation('A', now) });
    expect(
      send({ type: 'OBSERVE', observation: { status: 'CONFIRMED' } }).ok,
    ).toBe(false);
    expect(c.sessions.A.observation).toBeNull();
  });
  it('fixture cannot send privileged panel commands', () => {
    expect(send({ type: 'DEMO', scenario: 'partial' }).ok).toBe(false);
    expect(c.mode).toBe('MANUAL');
  });
  it('demo state is discarded when binding real browser fixture metadata', () => {
    send({ type: 'DEMO', scenario: 'partial' }, panel);
    send({ type: 'BIND', role: 'A' });
    expect(c.sessions.B.observation).toBeNull();
    expect(c.mode).toBe('FIXTURE');
  });
  it('never gives both roles the same tab', () => {
    const sessions = emptySessions();
    const binding = {
      tabId: 1,
      windowId: 1,
      documentId: 'same',
      incognito: false,
    };
    expect(bindSession(sessions, 'A', binding, true)).toBe(true);
    expect(
      bindSession(sessions, 'B', { ...binding, incognito: true }, true),
    ).toBe(false);
    expect(boundRole(sessions, binding)).toBe('A');
  });
});

it('rejects impossible dates, out of range times and missing seat geometry', () => {
  const observation = fictionalObservation('A', now);
  for (const date of ['2030-02-30', '2030-13-01', 'not-a-date']) {
    expect(
      fixtureCommandSchema.safeParse({
        type: 'OBSERVE',
        observation: {
          ...observation,
          showtime: { ...observation.showtime, date },
        },
      }).success,
    ).toBe(false);
  }
  expect(
    fixtureCommandSchema.safeParse({
      type: 'OBSERVE',
      observation: {
        ...observation,
        showtime: { ...observation.showtime, time: '25:90' },
      },
    }).success,
  ).toBe(false);
  expect(
    fixtureCommandSchema.safeParse({
      type: 'OBSERVE',
      observation: { ...observation, seat: { label: 'F10' } },
    }).success,
  ).toBe(false);
});
