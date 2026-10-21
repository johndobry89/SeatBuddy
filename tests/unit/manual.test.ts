import { review, seats } from '../helpers/workflow';
import { describe, expect, it } from 'vitest';
import {
  applyManual,
  emptyManual,
  expireManual,
  invalidateManualTab,
  manualSteps,
  manualSummary,
  planningSchema,
  MANUAL_AGE_MS,
  type ManualState,
} from '../../src/core/manual-assistant';
import { fictionalObservation } from '../../src/fixtures/data';
import { Coordinator } from '../../src/background/coordinator';
import { routeMessage } from '../../src/background/message-router';
import type { Role } from '../../src/core/types';
const now = 1_000_000;
const plan = fictionalObservation('A', now).showtime;
function ready() {
  const state = emptyManual();
  expect(applyManual(state, { type: 'PLAN', plan }, now)).toBeNull();
  expect(
    applyManual(
      state,
      { type: 'PLANNING_MODE', mode: 'TOGETHER', resetB: false },
      now,
    ),
  ).toBeNull();
  seats(state, now);
  review(state, now);
  return state;
}
function details(state: ManualState, role: Role) {
  return applyManual(
    state,
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
}
function finish(state: ManualState, role: Role) {
  details(state, role);
  const other = role === 'A' ? 'B' : 'A';
  if (state.tracks[other].problem) details(state, other);
  review(state, now);
  for (const step of manualSteps)
    expect(
      applyManual(state, { type: 'ACKNOWLEDGE', role, step }, now, [], true),
    ).toBeNull();
}
describe('manual plan and independent self reports', () => {
  it('requires valid film/location/date/time, permits an explicitly unknown hall', () => {
    for (const key of ['movie', 'cinema', 'date', 'time'] as const)
      expect(planningSchema.safeParse({ ...plan, [key]: null }).success).toBe(
        false,
      );
    expect(
      planningSchema.safeParse({ ...plan, date: '2030-02-30' }).success,
    ).toBe(false);
    expect(planningSchema.safeParse({ ...plan, hall: null }).success).toBe(
      true,
    );
  });
  it('cannot skip review or turn user data into a real confirmation', () => {
    const state = ready();
    expect(
      applyManual(state, { type: 'ACKNOWLEDGE', role: 'A', step: 'DONE' }, now),
    ).not.toBeNull();
    finish(state, 'A');
    expect(manualSummary(state)).toMatchObject({
      partial: true,
      done: ['A'],
      match: 'UNKNOWN',
    });
    expect(state.tracks.B.completed).toEqual([]);
    expect(JSON.stringify(state)).not.toContain('CONFIRMED');
  });
  it('does not match an unknown hall or a changed screening, and rejects mismatch progression', () => {
    const state = ready();
    details(state, 'A');
    state.tracks.A.reportedShowtime!.hall = null;
    applyManual(
      state,
      { type: 'ACKNOWLEDGE', role: 'A', step: 'ACCOUNT' },
      now,
    );
    expect(
      applyManual(
        state,
        { type: 'ACKNOWLEDGE', role: 'A', step: 'SHOWTIME' },
        now,
      ),
    ).not.toBeNull();
    state.tracks.A.reportedShowtime = { ...plan, time: '21:00' };
    expect(
      applyManual(
        state,
        { type: 'ACKNOWLEDGE', role: 'A', step: 'SHOWTIME' },
        now,
      ),
    ).not.toBeNull();
    expect(manualSummary(state).match).toBe('UNKNOWN');
  });
  it('labels matching self reports and consecutive numbers without a verified adjacency claim', () => {
    const state = ready();
    finish(state, 'A');
    finish(state, 'B');
    expect(manualSummary(state)).toMatchObject({
      match: 'MATCH',
      adjacency: 'CONSECUTIVE_UNVERIFIED',
      partial: false,
    });
    state.plan!.hall = null;
    expect(manualSummary(state).adjacency).toBe('UNKNOWN');
    state.plan!.hall = 'Zaal 2';
    state.tracks.B.seat.row = 'G';
    expect(manualSummary(state).adjacency).toBe('NOT_CONSECUTIVE');
  });
  it('editing A preserves B, plan replacement invalidates both, no persistence on worker restart', () => {
    const state = ready();
    finish(state, 'A');
    finish(state, 'B');
    details(state, 'A');
    expect(state.tracks.A.completed).toEqual([]);
    expect(state.tracks.B.completed).toHaveLength(5);
    applyManual(state, { type: 'PLAN', plan: { ...plan, time: '21:00' } }, now);
    expect(state.tracks.B.completed).toEqual([]);
    const c = new Coordinator();
    c.manual = state;
    expect(new Coordinator().manual.plan).toBeNull();
  });
  it('expires user reports and never repeats a completion or transaction', () => {
    const state = ready();
    finish(state, 'A');
    expireManual(state, now + MANUAL_AGE_MS, false);
    expect(state.tracks.A.completed).toEqual([]);
    expect(state.tracks.A.problem).toBe('STALE');
    expect(
      applyManual(
        state,
        { type: 'ACKNOWLEDGE', role: 'A', step: 'DONE' },
        now + MANUAL_AGE_MS,
      ),
    ).not.toBeNull();
  });
});
describe('manual Chrome context is browser metadata, never site/account evidence', () => {
  const normal = { tabId: 7, windowId: 1, incognito: false };
  const incognito = { tabId: 8, windowId: 2, incognito: true };
  it('requires an active browser-provided context of the right role and explicit consent', () => {
    const state = ready();
    expect(
      applyManual(
        state,
        { type: 'BIND_CONTEXT', role: 'A', tabId: 99 },
        now,
        [normal],
        true,
      ),
    ).not.toBeNull();
    expect(
      applyManual(
        state,
        { type: 'BIND_CONTEXT', role: 'B', tabId: 7 },
        now,
        [normal],
        true,
      ),
    ).not.toBeNull();
    expect(
      applyManual(
        state,
        { type: 'BIND_CONTEXT', role: 'B', tabId: 8 },
        now,
        [incognito],
        false,
      ),
    ).not.toBeNull();
    expect(
      applyManual(
        state,
        { type: 'BIND_CONTEXT', role: 'A', tabId: 7 },
        now,
        [normal],
        true,
      ),
    ).toBeNull();
    expect(
      applyManual(
        state,
        { type: 'BIND_CONTEXT', role: 'B', tabId: 8 },
        now,
        [incognito],
        true,
      ),
    ).toBeNull();
    expect(manualSummary(state).match).toBe('UNKNOWN');
  });
  it('invalidates on permission revocation, unbind, navigation and tab close', () => {
    const state = ready();
    applyManual(
      state,
      { type: 'BIND_CONTEXT', role: 'B', tabId: 8 },
      now,
      [incognito],
      true,
    );
    finish(state, 'B');
    expireManual(state, now, false);
    expect(state.tracks.B.context).toBeNull();
    expect(state.tracks.B.problem).toBe('PERMISSION');
    applyManual(
      state,
      { type: 'BIND_CONTEXT', role: 'A', tabId: 7 },
      now,
      [normal],
      true,
    );
    finish(state, 'A');
    invalidateManualTab(state, 7, 'CLOSED');
    expect(state.tracks.A.problem).toBe('CLOSED');
    expect(state.tracks.A.completed).toEqual([]);
  });
  it('refuses manual/privileged commands from an untrusted page or fixture', () => {
    const c = new Coordinator();
    for (const url of [
      'https://www.vuecinemas.nl/',
      'chrome-extension://test/fixture.html',
    ]) {
      expect(
        routeMessage(
          c,
          { type: 'BIND_CONTEXT', role: 'A', tabId: 7 },
          {
            id: 'test',
            url,
            frameId: 0,
            documentId: 'x',
            tab: { id: 7, windowId: 1, incognito: false },
          },
          'test',
          true,
          now,
          [normal],
        ).ok,
      ).toBe(false);
    }
    expect(c.manual.tracks.A.context).toBeNull();
  });
  it.each(['LOGOUT', 'MISMATCH', 'FAILED'] as const)(
    'keeps failures and partial state independent: %s',
    (problem) => {
      const state = ready();
      finish(state, 'A');
      finish(state, 'B');
      applyManual(state, { type: 'REPORT_PROBLEM', role: 'B', problem }, now);
      expect(manualSummary(state).partial).toBe(true);
      expect(state.tracks.A.completed).toHaveLength(5);
      expect(state.tracks.B.problem).toBe(problem);
    },
  );
});
