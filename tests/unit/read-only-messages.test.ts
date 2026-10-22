import { diagnosticText, selfCheck } from '../../src/privacy/diagnostics';
import { describe, expect, it } from 'vitest';
import { Coordinator } from '../../src/background/coordinator';
import { routeMessage, type Sender } from '../../src/background/message-router';
import { fixtureLeaseReplySchema } from '../../src/privacy/protocol';
import type { ReadOnlyObservation } from '../../src/adapters/read-only/contract';
import { invalidateTab } from '../../src/background/session-registry';
import {
  savedDraftSchema,
  savedRosterSchema,
} from '../../src/core/retained-data';
const id = 'a'.repeat(32);
const A: Sender = {
  id,
  url: `chrome-extension://${id}/fixture.html`,
  frameId: 0,
  documentId: 'doc-a',
  tab: { id: 11, windowId: 1, incognito: false },
};
const B: Sender = {
  ...A,
  documentId: 'doc-b',
  tab: { id: 12, windowId: 2, incognito: true },
};
function setup() {
  let c = new Coordinator();
  const send = (message: unknown, sender = A, allowed = true, now = 100_000) =>
    routeMessage(c, message, sender, id, allowed, now);
  function bind(sender = A) {
    const reply = fixtureLeaseReplySchema.parse(
      send({ type: 'READONLY_BIND', role: sender === A ? 'A' : 'B' }, sender),
    );
    if (!reply.ok) throw new Error('Fictional binding refused');
    return reply.lease;
  }
  const observation: ReadOnlyObservation = {
    kind: 'FICTIONAL_READ_ONLY',
    status: 'UNKNOWN',
    provenance: {
      source: 'PACKAGED_FICTION',
      world: 'ISOLATED',
      observedAt: 100_000,
    },
    screening: {
      movie: 'De maan van papier',
      cinema: 'Fictief Filmhuis',
      date: '2030-04-12',
      time: '19:30',
      hall: 'Zaal 2',
    },
    seatDisplay: {
      labels: ['F10', 'F11'],
      geometry: 'UNKNOWN',
      availability: 'UNKNOWN',
      relationship: 'LABELS_ONLY_UNVERIFIED',
    },
    compatibility: 'READABLE_FICTION',
  };
  return {
    get c() {
      return c;
    },
    restart() {
      c = new Coordinator();
    },
    send,
    bind,
    observation,
  };
}
describe('read-only fixture receipts never become booking evidence', () => {
  it('separates browser-provenanced A/B receipts and does not store observed data or promote self-report', () => {
    const f = setup(),
      a = f.bind(),
      b = f.bind(B);
    const before = f.c.snapshot(100_000, true);
    expect(
      f.send({
        type: 'READONLY_OBSERVE',
        lease: a,
        observation: f.observation,
      }),
    ).toEqual({ ok: true });
    expect(
      f.send(
        { type: 'READONLY_OBSERVE', lease: b, observation: f.observation },
        B,
      ),
    ).toEqual({ ok: true });
    expect(f.c.snapshot(100_000, true)).toEqual(before);
    const copied = diagnosticText(
      selfCheck(f.c.snapshot(100_000, true), false),
    );
    for (const value of [
      'De maan van papier',
      'Fictief Filmhuis',
      '2030-04-12',
      'F10',
      'F11',
      a,
      b,
    ])
      expect(copied).not.toContain(value);
    expect(savedDraftSchema.safeParse(f.observation).success).toBe(false);
    expect(savedRosterSchema.safeParse(f.observation).success).toBe(false);
  });
  it('refuses peer token, forged role, document/window/origin and local-preview provenance', () => {
    const f = setup(),
      a = f.bind();
    f.bind(B);
    const msg = {
      type: 'READONLY_OBSERVE',
      lease: a,
      observation: f.observation,
    };
    for (const sender of [
      B,
      { ...A, documentId: 'replacement' },
      { ...A, url: 'https://www.vuecinemas.nl/' },
      { ...A, tab: { ...A.tab!, windowId: 9 } },
    ])
      expect(f.send(msg, sender).ok).toBe(false);
    expect(f.send({ ...msg, role: 'B' }).ok).toBe(false);
    expect(
      f.send({
        ...msg,
        observation: {
          ...f.observation,
          provenance: { ...f.observation.provenance, world: 'LOCAL_PREVIEW' },
        },
      }).ok,
    ).toBe(false);
    expect(f.send({ type: 'OBSERVE', observation: f.observation }).ok).toBe(
      false,
    );
  });
  it('refuses stale, future and replayed reads', () => {
    const f = setup(),
      lease = f.bind();
    const msg = { type: 'READONLY_OBSERVE', lease, observation: f.observation };
    expect(f.send(msg).ok).toBe(true);
    expect(f.send(msg).ok).toBe(false);
    expect(
      f.send({
        ...msg,
        observation: {
          ...f.observation,
          provenance: { ...f.observation.provenance, observedAt: 100_001 },
        },
      }).ok,
    ).toBe(false);
    expect(f.send(msg, A, true, 130_000).ok).toBe(false);
  });
  it('refuses old receipts after rebind, navigation, reset and actual worker replacement', () => {
    for (const action of ['rebind', 'navigate', 'reset', 'restart']) {
      const f = setup(),
        lease = f.bind();
      if (action === 'rebind') f.bind();
      if (action === 'navigate') invalidateTab(f.c.sessions, 11);
      if (action === 'reset') f.c.reset();
      if (action === 'restart') f.restart();
      f.bind();
      expect(
        f.send({ type: 'READONLY_OBSERVE', lease, observation: f.observation })
          .ok,
      ).toBe(false);
    }
  });
  it('B buddy replacement and permission revocation invalidate B without cross-pollinating A', () => {
    const f = setup(),
      a = f.bind(),
      b = f.bind(B);
    expect(
      f.c.buddyCommand({
        type: 'BUDDY_MUTATE',
        generation: f.c.generation,
        revision: f.c.buddy.revision,
        resetB: true,
        action: { kind: 'ADD', nickname: 'Fictief' },
      }).ok,
    ).toBe(true);
    const buddy = f.c.buddy.roster[0]!;
    expect(
      f.c.buddyCommand({
        type: 'BUDDY_MUTATE',
        generation: f.c.generation,
        revision: f.c.buddy.revision,
        resetB: true,
        action: { kind: 'SELECT', id: buddy.id },
      }).ok,
    ).toBe(true);
    expect(
      f.send(
        { type: 'READONLY_OBSERVE', lease: b, observation: f.observation },
        B,
      ).ok,
    ).toBe(false);
    expect(
      f.send({ type: 'READONLY_OBSERVE', lease: a, observation: f.observation })
        .ok,
    ).toBe(true);
    const next = f.bind(B);
    expect(
      f.send(
        { type: 'READONLY_OBSERVE', lease: next, observation: f.observation },
        B,
        false,
      ).ok,
    ).toBe(false);
    f.bind(B);
    expect(
      f.send(
        { type: 'READONLY_OBSERVE', lease: next, observation: f.observation },
        B,
      ).ok,
    ).toBe(false);
  });
});
