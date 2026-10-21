import { expect, it, vi } from 'vitest';
import { Coordinator } from '../../src/background/coordinator';
import { RetainedData } from '../../src/background/retained-data';
import { routeMessage } from '../../src/background/message-router';
import {
  ROSTER_KEY,
  DRAFT_KEY,
  DRAFT_TTL_MS,
  freshDraft,
  savedRosterSchema,
  savedDraftSchema,
} from '../../src/core/retained-data';
import { fictionalObservation } from '../../src/fixtures/data';
import { memoryStorage } from '../helpers/storage';
import { panelReplySchema } from '../../src/privacy/protocol';
const id = 'retention-test';
const panel = {
  id,
  url: `chrome-extension://${id}/sidepanel.html`,
  frameId: 0,
};
const now = 1_000_000;
const plan = fictionalObservation('A', now).showtime;
function boot(port = memoryStorage()) {
  const c = new Coordinator();
  const store = new RetainedData(c, port);
  let stale = false;
  const send = async (raw: unknown, time = now, allowed = false) => {
    const route = (message: unknown) =>
      routeMessage(c, message, panel, id, allowed, time);
    return store.execute(
      raw,
      time,
      allowed,
      () => route(raw),
      () => route({ type: 'GET_STATE' }),
      () => stale,
    );
  };
  const gate = () => ({ generation: c.generation, revision: c.buddy.revision });
  const remember = (enabled: boolean) =>
    send({ type: 'REMEMBER_BUDDIES', ...gate(), enabled });
  const add = (nickname: string) =>
    send({
      type: 'BUDDY_MUTATE',
      ...gate(),
      resetB: false,
      action: { kind: 'ADD', nickname },
    });
  return {
    c,
    store,
    port,
    send,
    gate,
    remember,
    add,
    obsolete: () => {
      stale = true;
    },
  };
}
it('default creates no stored records; opt-in persists only opaque IDs/nicknames and never the selection or proof', async () => {
  const b = boot();
  await b.send({ type: 'GET_STATE' });
  await b.add('Filmmaatje');
  expect(b.port.local.values).toEqual({});
  expect(b.port.session.values).toEqual({});
  expect(b.port.local.calls[0]).toBe('protect');
  expect((await b.remember(true)).ok).toBe(true);
  const first = b.c.buddy.roster[0]!;
  expect(b.port.local.values).toEqual({
    [ROSTER_KEY]: {
      version: 1,
      roster: [{ id: first.id, nickname: 'Filmmaatje' }],
    },
  });
  await b.send({
    type: 'BUDDY_MUTATE',
    ...b.gate(),
    resetB: true,
    action: { kind: 'SELECT', id: first.id },
  });
  const restarted = boot(b.port);
  const reply = panelReplySchema.parse(
    await restarted.send({ type: 'GET_STATE' }),
  );
  expect(reply.ok && reply.state.buddy.roster[0]?.id).toBe(first.id);
  expect(reply.ok && reply.state.buddy.selectedId).toBeNull();
  expect(reply.ok && reply.state.manual.plan).toBeNull();
  expect(reply.ok && reply.state.manual.tracks.A.completed).toEqual([]);
  expect(reply.ok && reply.state.manual.tracks.B.context).toBeNull();
  expect(reply.ok && reply.state.retention.mode).toBe('REMEMBERED');
  expect(
    await restarted.send({
      type: 'REMEMBER_BUDDIES',
      ...b.gate(),
      enabled: true,
    }),
  ).toMatchObject({ ok: false, code: 'STALE_BUDDY' });
});
it('temporary names do not survive; disabling deletes the persistent key and session concept while retaining only current memory names', async () => {
  const b = boot();
  await b.add('Filmmaatje');
  const restarted = boot(b.port);
  await restarted.send({ type: 'GET_STATE' });
  expect(restarted.c.buddy.roster).toEqual([]);
  await b.remember(true);
  await b.send({ type: 'DRAFT_SAVE', ...b.gate(), plan });
  expect((await b.remember(false)).ok).toBe(true);
  expect(b.port.local.values).toEqual({});
  expect(b.port.session.values).toEqual({});
  expect(b.c.buddy.roster).toHaveLength(1);
  expect(b.c.retention.mode).toBe('TEMPORARY');
});
it('serializes writes, rejects concurrent old revisions, and hydrates before a new mutation can overwrite the roster', async () => {
  const b = boot();
  await b.add('Filmmaatje');
  await b.remember(true);
  const gate = b.gate();
  const buddy = b.c.buddy.roster[0]!;
  const first = b.send({
    type: 'BUDDY_MUTATE',
    ...gate,
    resetB: false,
    action: { kind: 'RENAME', id: buddy.id, nickname: 'Avondbuddy' },
  });
  const second = b.send({
    type: 'BUDDY_MUTATE',
    ...gate,
    resetB: false,
    action: { kind: 'RENAME', id: buddy.id, nickname: 'Oude opdracht' },
  });
  expect((await first).ok).toBe(true);
  expect((await second).ok).toBe(false);
  expect(
    savedRosterSchema.parse(b.port.local.values[ROSTER_KEY]).roster[0]
      ?.nickname,
  ).toBe('Avondbuddy');
  const next = boot(b.port);
  expect((await next.add('Vertraagde nieuwe buddy')).ok).toBe(false);
  expect(next.c.buddy.roster.map((buddy) => buddy.nickname)).toEqual([
    'Avondbuddy',
  ]);
});
it.each([
  { version: 99, roster: [] },
  { version: 1, roster: [], token: 'fictional-only' },
  'x'.repeat(5000),
])(
  'clears malformed/versioned/oversized storage without hydrating it: %j',
  async (record) => {
    const b = boot();
    b.port.local.values[ROSTER_KEY] = record;
    await b.send({ type: 'GET_STATE' });
    expect(b.c.buddy.roster).toEqual([]);
    expect(b.port.local.values).toEqual({});
  },
);
it('enforces access restriction before reads; reported API failure leaves a working ephemeral coordinator', async () => {
  const b = boot();
  vi.spyOn(b.port.local, 'setAccessLevel').mockRejectedValue(
    new Error('Unavailable'),
  );
  await b.add('Filmmaatje');
  expect(b.port.local.calls).toEqual([]);
  expect(b.c.buddy.roster).toHaveLength(1);
  expect((await b.remember(true)).ok).toBe(false);
  expect(b.c.retention.mode).toBe('UNAVAILABLE');
});
it('failed write falls back truthfully, removes old saved data and never restores B proof', async () => {
  const b = boot();
  await b.add('Filmmaatje');
  await b.remember(true);
  vi.spyOn(b.port.local, 'set').mockRejectedValueOnce(new Error('Unavailable'));
  expect((await b.add('Nieuw maatje')).ok).toBe(false);
  expect(b.port.local.values).toEqual({});
  expect(b.c.retention.mode).toBe('TEMPORARY');
  expect(b.c.buddy.roster).toHaveLength(2);
});
it('individual removal and clear-all update/delete saved names, while the fixture never sees a remembered name', async () => {
  const b = boot();
  await b.add('Filmmaatje');
  await b.add('Avondbuddy');
  await b.remember(true);
  await b.send({
    type: 'BUDDY_MUTATE',
    ...b.gate(),
    resetB: true,
    action: { kind: 'SELECT', id: b.c.buddy.roster[0]!.id },
  });
  expect(
    routeMessage(
      b.c,
      { type: 'GET_BUDDY' },
      {
        id,
        url: `chrome-extension://${id}/fixture.html`,
        frameId: 0,
        documentId: 'fake',
        tab: { id: 7, windowId: 1, incognito: false },
      },
      id,
      false,
      now,
    ),
  ).toEqual({ ok: true, buddy: null });
  await b.send({
    type: 'BUDDY_MUTATE',
    ...b.gate(),
    resetB: true,
    action: { kind: 'REMOVE', id: b.c.buddy.roster[0]!.id },
  });
  expect(
    savedRosterSchema.parse(b.port.local.values[ROSTER_KEY]).roster,
  ).toHaveLength(1);
  await b.send({
    type: 'BUDDY_MUTATE',
    ...b.gate(),
    resetB: true,
    action: { kind: 'CLEAR' },
  });
  expect(b.port.local.values).toEqual({});
});
it('session concept survives worker replacement but restores only explicit uncommitted input, never seats/status/bindings', async () => {
  const b = boot();
  await b.send({ type: 'GET_STATE' });
  await b.send({ type: 'PLAN', plan });
  await b.send({ type: 'ACKNOWLEDGE', role: 'A', step: 'ACCOUNT' });
  await b.send({ type: 'DRAFT_SAVE', ...b.gate(), plan });
  const stored = savedDraftSchema.parse(b.port.session.values[DRAFT_KEY]);
  expect(stored).toEqual({ version: 1, createdAt: now, plan });
  const next = boot(b.port);
  await next.send({ type: 'GET_STATE' });
  expect(next.c.manual.plan).toBeNull();
  const reply = panelReplySchema.parse(
    await next.send({ type: 'DRAFT_RESTORE', ...next.gate() }),
  );
  expect(reply.ok && reply.restoredDraft).toEqual(plan);
  expect(reply.ok && reply.state.manual.plan).toBeNull();
  expect(reply.ok && reply.state.manual.tracks.A.completed).toEqual([]);
  expect(reply.ok && reply.state.manual.tracks.B.seat.number).toBe('');
  await next.send({ type: 'DRAFT_DELETE', ...next.gate() });
  expect(next.port.session.values).toEqual({});
});
it.each([-1, DRAFT_TTL_MS, DRAFT_TTL_MS + 1])(
  'rejects future or expired concepts at offset %s and clears invalid data',
  async (offset) => {
    const b = boot();
    const record = { version: 1, createdAt: now, plan };
    expect(freshDraft(record, now + offset)).toBeNull();
    b.port.session.values[DRAFT_KEY] = record;
    await b.send({ type: 'GET_STATE' }, now + offset);
    expect(b.port.session.values).toEqual({});
  },
);
it('expires a live concept and clears it on full reset or incognito-consent scope change', async () => {
  const b = boot();
  await b.send({ type: 'GET_STATE' });
  for (const action of ['expire', 'consent', 'reset'] as const) {
    await b.send({ type: 'DRAFT_SAVE', ...b.gate(), plan });
    if (action === 'expire')
      await b.send({ type: 'GET_STATE' }, now + DRAFT_TTL_MS);
    if (action === 'consent') await b.send({ type: 'GET_STATE' }, now, true);
    if (action === 'reset') await b.send({ type: 'RESET' });
    expect(b.port.session.values).toEqual({});
  }
});
it('strict boundaries reject account/proof/seat fields, duplicate rosters and invalid draft labels', async () => {
  const b = boot();
  await b.send({ type: 'GET_STATE' });
  for (const extra of [
    { password: 'fictional' },
    { seat: 'F10' },
    { confirmed: true },
    { incognito: true },
  ]) {
    expect(
      savedRosterSchema.safeParse({ version: 1, roster: [], ...extra }).success,
    ).toBe(false);
    expect(
      savedDraftSchema.safeParse({ version: 1, createdAt: now, plan, ...extra })
        .success,
    ).toBe(false);
    expect(
      (await b.send({ type: 'DRAFT_SAVE', ...b.gate(), plan, ...extra })).ok,
    ).toBe(false);
  }
  expect(b.port.local.values).toEqual({});
  expect(b.port.session.values).toEqual({});
});
it('does not run stale queued mutations after an authenticated reset barrier', async () => {
  const b = boot();
  b.obsolete();
  expect((await b.add('Oude opdracht')).ok).toBe(false);
  expect(b.c.buddy.roster).toEqual([]);
});

it('same-generation disable wins over an unrelated newer roster revision, but cannot enable with that old revision', async () => {
  const b = boot();
  await b.add('Filmmaatje');
  await b.remember(true);
  const old = b.gate();
  await b.add('Avondbuddy');
  expect(
    (await b.send({ type: 'REMEMBER_BUDDIES', ...old, enabled: true })).ok,
  ).toBe(false);
  expect(
    (await b.send({ type: 'REMEMBER_BUDDIES', ...old, enabled: false })).ok,
  ).toBe(true);
  expect(b.port.local.values).toEqual({});
  expect(b.c.buddy.roster).toHaveLength(2);
});
it('reports unconfirmed deletion instead of claiming success, and can delete a concept even after its read failed', async () => {
  const b = boot();
  await b.add('Filmmaatje');
  await b.remember(true);
  vi.spyOn(b.port.local, 'remove').mockRejectedValue(new Error('No deletion'));
  expect((await b.remember(false)).ok).toBe(false);
  expect(b.c.retention.mode).toBe('UNAVAILABLE');
  expect(b.port.local.values[ROSTER_KEY]).toBeTruthy();
  expect((await b.send({ type: 'RESET' })).ok).toBe(false);
  const next = boot();
  next.port.session.values[DRAFT_KEY] = { version: 1, createdAt: now, plan };
  vi.spyOn(next.port.session, 'get').mockRejectedValue(
    new Error('Read failed'),
  );
  await next.send({ type: 'GET_STATE' });
  expect(next.c.retention.draftSupported).toBe(false);
  expect((await next.send({ type: 'RESET' })).ok).toBe(true);
  expect(next.port.session.values).toEqual({});
});

it('does not claim local deletion when a session write fails while local access is unavailable', async () => {
  const b = boot();
  vi.spyOn(b.port.local, 'setAccessLevel').mockRejectedValue(
    new Error('Unavailable local area'),
  );
  vi.spyOn(b.port.session, 'set').mockRejectedValue(
    new Error('Unavailable session write'),
  );
  await b.send({ type: 'GET_STATE' });
  const result = await b.send({ type: 'DRAFT_SAVE', ...b.gate(), plan });
  expect(result.ok).toBe(false);
  expect(b.c.retention.notice).toContain('verwijderen niet bevestigd');
  expect(b.c.retention.notice).not.toContain('concept verwijderd');
});
