import { expect, it } from 'vitest';
import { Coordinator } from '../../src/background/coordinator';
import {
  applyManual,
  emptyManual,
  expireManual,
  invalidateManualTab,
  hasBHistory,
  manualSteps,
  manualSummary,
  preflightIssue,
  MANUAL_AGE_MS,
} from '../../src/core/manual-assistant';
import { routeMessage } from '../../src/background/message-router';
import { fictionalObservation } from '../../src/fixtures/data';
import { diagnosticText, selfCheck } from '../../src/privacy/diagnostics';
import { workflow, seats, review } from '../helpers/workflow';
const now = 1_000_000;
const plan = fictionalObservation('A', now).showtime;
const panel = {
  id: 'test',
  url: 'chrome-extension://test/sidepanel.html',
  frameId: 0,
};
function prepared() {
  const c = new Coordinator();
  c.manualCommand({ type: 'PLAN', plan }, now, [], true);
  c.manualCommand(
    { type: 'PLANNING_MODE', mode: 'TOGETHER', resetB: false },
    now,
    [],
    true,
  );
  seats(c.manual, now);
  review(c.manual, now);
  return c;
}
const route = (c: Coordinator, raw: unknown) =>
  routeMessage(c, raw, panel, 'test', true, now);
it('starts solo and never activates B when selecting a nickname', () => {
  const c = new Coordinator();
  expect(c.manual.planningMode).toBe('SOLO');
  c.buddyCommand({
    type: 'BUDDY_MUTATE',
    generation: c.generation,
    revision: 0,
    resetB: false,
    action: { kind: 'DEMO' },
  });
  c.buddyCommand({
    type: 'BUDDY_MUTATE',
    generation: c.generation,
    revision: c.buddy.revision,
    resetB: true,
    action: { kind: 'SELECT', id: c.buddy.roster[0]!.id },
  });
  expect(c.manual.planningMode).toBe('SOLO');
  expect(
    c.manualCommand(
      { type: 'ACKNOWLEDGE', role: 'B', step: 'ACCOUNT' },
      now,
      [],
      false,
    ),
  ).not.toBeNull();
  expect(c.manual.tracks.B.completed).toEqual([]);
});
it('requires a real local review before any own step and rejects unknown hall/missing seat/mismatch', () => {
  const state = emptyManual();
  applyManual(state, { type: 'PLAN', plan: { ...plan, hall: null } }, now);
  expect(
    applyManual(
      state,
      { type: 'ACKNOWLEDGE', role: 'A', step: 'ACCOUNT' },
      now,
    ),
  ).not.toBeNull();
  expect(applyManual(state, { type: 'REVIEW_PLAN' }, now)).toContain('UNKNOWN');
  applyManual(state, { type: 'PLAN', plan }, now);
  expect(preflightIssue(state)).toContain('stoel');
  applyManual(
    state,
    {
      type: 'MANUAL_DETAILS',
      role: 'A',
      showtime: { ...plan, time: '21:00' },
      seat: { row: 'F', number: '10' },
    },
    now,
  );
  expect(applyManual(state, { type: 'REVIEW_PLAN' }, now)).toContain(
    'wijkt af',
  );
  expect(state.review).toBeNull();
});
it('solo review needs only A and does not present a partial group outcome', () => {
  const state = emptyManual();
  applyManual(state, { type: 'PLAN', plan }, now);
  applyManual(
    state,
    {
      type: 'MANUAL_DETAILS',
      role: 'A',
      showtime: plan,
      seat: { row: 'F', number: '10' },
    },
    now,
  );
  review(state, now);
  for (const step of manualSteps)
    expect(
      applyManual(state, { type: 'ACKNOWLEDGE', role: 'A', step }, now),
    ).toBeNull();
  expect(manualSummary(state)).toMatchObject({
    done: ['A'],
    partial: false,
    match: 'UNKNOWN',
    adjacency: 'UNKNOWN',
  });
  expect(state.tracks.B).toEqual(emptyManual().tracks.B);
});
it('requires confirmation before resetting B history, preserving every A field/check/context', () => {
  const c = prepared();
  c.manualCommand(
    { type: 'ACKNOWLEDGE', role: 'A', step: 'ACCOUNT' },
    now,
    [],
    true,
  );
  c.manual.tracks.B.context = { tabId: 8, windowId: 2, incognito: true };
  const A = structuredClone(c.manual.tracks.A);
  const oldEpoch = c.buddyEpoch;
  expect(hasBHistory(c.manual)).toBe(true);
  expect(
    c.manualCommand(
      { type: 'PLANNING_MODE', mode: 'SOLO', resetB: false },
      now,
      [],
      true,
    ),
  ).toContain('Bevestig');
  expect(c.manual.planningMode).toBe('TOGETHER');
  expect(
    c.manualCommand(
      { type: 'PLANNING_MODE', mode: 'SOLO', resetB: true },
      now,
      [],
      true,
    ),
  ).toBeNull();
  expect(c.manual.tracks.A).toEqual(A);
  expect(c.manual.tracks.B).toEqual(emptyManual().tracks.B);
  expect(c.manual.review).toBeNull();
  expect(c.buddyEpoch).toBeGreaterThan(oldEpoch);
});
it('B edits invalidate shared review/comparison, preserve A self-reports, and require fresh review before further checks', () => {
  const c = prepared();
  for (const role of ['A', 'B'] as const)
    for (const step of ['ACCOUNT', 'SHOWTIME'] as const)
      c.manualCommand({ type: 'ACKNOWLEDGE', role, step }, now, [], true);
  expect(manualSummary(c.manual).match).toBe('MATCH');
  const A = structuredClone(c.manual.tracks.A);
  c.manualCommand(
    {
      type: 'MANUAL_DETAILS',
      role: 'B',
      showtime: plan,
      seat: { row: 'G', number: '12' },
    },
    now,
    [],
    true,
  );
  expect(c.manual.tracks.A).toEqual(A);
  expect(manualSummary(c.manual).match).toBe('UNKNOWN');
  expect(
    c.manualCommand(
      { type: 'ACKNOWLEDGE', role: 'A', step: 'SEATS' },
      now,
      [],
      true,
    ),
  ).not.toBeNull();
  review(c.manual, now);
  expect(
    c.manualCommand(
      { type: 'ACKNOWLEDGE', role: 'A', step: 'SEATS' },
      now,
      [],
      true,
    ),
  ).toBeNull();
});
it('keeps together intent only for same film night edits; unrelated replacement and worker/reset start solo', () => {
  const c = prepared();
  c.manualCommand(
    { type: 'PLAN', plan: { ...plan, hall: 'Zaal 3' } },
    now,
    [],
    true,
  );
  expect(c.manual.planningMode).toBe('TOGETHER');
  c.manualCommand(
    { type: 'PLAN', plan: { ...plan, date: '2030-04-13' } },
    now,
    [],
    true,
  );
  expect(c.manual.planningMode).toBe('SOLO');
  expect(new Coordinator().manual.planningMode).toBe('SOLO');
  c.reset();
  expect(c.manual.review).toBeNull();
  expect(c.manual.planningMode).toBe('SOLO');
});
it.each(['legacy', 'old generation', 'old revision', 'old B epoch'] as const)(
  'refuses %s commands without mutating a track',
  (kind) => {
    const c = prepared();
    const wrapped = workflow(c, {
      type: 'ACKNOWLEDGE',
      role: 'B',
      step: 'ACCOUNT',
    });
    const raw =
      kind === 'legacy'
        ? {
            type: 'B_COMMAND',
            generation: c.generation,
            buddyEpoch: c.buddyEpoch,
            command: wrapped.command,
          }
        : {
            ...wrapped,
            ...(kind === 'old generation'
              ? { generation: crypto.randomUUID() }
              : kind === 'old revision'
                ? { revision: wrapped.revision - 1 }
                : { buddyEpoch: wrapped.buddyEpoch - 1 }),
          };
    const before = structuredClone(c.manual);
    expect(route(c, raw).ok).toBe(false);
    expect(c.manual).toEqual(before);
  },
);
it('cannot replay a review, double acknowledgement or old-mode command after rapid off/on', () => {
  const c = prepared();
  const ack = workflow(c, { type: 'ACKNOWLEDGE', role: 'B', step: 'ACCOUNT' });
  expect(route(c, ack).ok).toBe(true);
  expect(route(c, ack).ok).toBe(false);
  const old = workflow(c, {
    type: 'MANUAL_DETAILS',
    role: 'B',
    showtime: plan,
    seat: { row: 'X', number: '99' },
  });
  c.manualCommand(
    { type: 'PLANNING_MODE', mode: 'SOLO', resetB: true },
    now,
    [],
    true,
  );
  c.manualCommand(
    { type: 'PLANNING_MODE', mode: 'TOGETHER', resetB: false },
    now,
    [],
    true,
  );
  expect(route(c, old).ok).toBe(false);
  expect(c.manual.tracks.B.seat.row).toBe('');
  expect(
    c.manualCommand({ type: 'REVIEW_PLAN' }, now, [], true),
  ).not.toBeNull();
});
it.each(['expiry', 'future', 'navigation', 'revocation'] as const)(
  'invalidates preflight for %s and blocks dependent steps',
  (reason) => {
    const c = prepared();
    if (reason === 'expiry') expireManual(c.manual, now + MANUAL_AGE_MS, true);
    if (reason === 'future') expireManual(c.manual, now - 1, true);
    if (reason === 'navigation') {
      c.manual.tracks.B.context = { tabId: 8, windowId: 2, incognito: true };
      invalidateManualTab(c.manual, 8);
    }
    if (reason === 'revocation') {
      c.manual.tracks.B.context = { tabId: 8, windowId: 2, incognito: true };
      expireManual(c.manual, now, false);
    }
    expect(c.manual.review).toBeNull();
    expect(
      c.manualCommand(
        { type: 'ACKNOWLEDGE', role: 'B', step: 'ACCOUNT' },
        now,
        [],
        true,
      ),
    ).not.toBeNull();
  },
);
it('diagnosis uses only strict technical fields, fixed build metadata and enumerated failure codes', () => {
  const c = prepared();
  c.manual.tracks.B.problem = 'FAILED';
  const report = selfCheck(c.snapshot(now, true), false);
  const text = diagnosticText(report);
  expect(JSON.parse(text)).toMatchObject({
    build: { version: '0.10.1', channel: 'TEST', diagnosticSchema: 1 },
    failedStep: 'FAILED',
    fixtureAdapter: 'FICTIONAL_V1_ONLY',
    productionAdapter: 'DISABLED_G0',
  });
  for (const value of [
    plan.movie!,
    plan.cinema!,
    plan.date!,
    plan.time!,
    plan.hall!,
    'F10',
    c.generation,
  ])
    expect(text).not.toContain(value);
  expect(() =>
    diagnosticText({
      ...report,
      build: { ...report.build, token: 'fictional' },
    }),
  ).toThrow();
  expect(() =>
    diagnosticText({
      ...report,
      failedStep: 'private raw error stack',
    }),
  ).toThrow();
});
