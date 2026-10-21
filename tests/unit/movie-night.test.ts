import { review, seats } from '../helpers/workflow';
import { expect, it } from 'vitest';
import { nextMovieNightStep, checkAge } from '../../src/core/movie-night';
import {
  emptyManual,
  applyManual,
  expireManual,
  manualSummary,
  manualSteps,
  MANUAL_AGE_MS,
} from '../../src/core/manual-assistant';
import { fictionalObservation } from '../../src/fixtures/data';
const now = 1_000_000;
function planned() {
  const state = emptyManual();
  applyManual(
    state,
    { type: 'PLAN', plan: fictionalObservation('A', now).showtime },
    now,
  );
  applyManual(
    state,
    { type: 'PLANNING_MODE', mode: 'TOGETHER', resetB: false },
    now,
  );
  return state;
}
it('guides missing plan and hall, independent account starts, incomplete seats and mismatch without inventing evidence', () => {
  expect(nextMovieNightStep(emptyManual()).code).toBe('PLAN');
  const state = planned();
  expect(nextMovieNightStep(state)).toMatchObject({
    code: 'PREFLIGHT',
  });
  state.plan!.hall = null;
  expect(nextMovieNightStep(state).code).toBe('HALL');
  state.plan!.hall = 'Zaal 2';
  state.tracks.B.reportedShowtime!.time = '21:00';
  expect(nextMovieNightStep(state).code).toBe('MISMATCH');
  state.tracks.B.reportedShowtime!.time = state.plan!.time;
  seats(state, now);
  review(state, now);
  applyManual(state, { type: 'ACKNOWLEDGE', role: 'A', step: 'ACCOUNT' }, now);
  applyManual(state, { type: 'ACKNOWLEDGE', role: 'A', step: 'SHOWTIME' }, now);
  expect(nextMovieNightStep(state)).toMatchObject({ code: 'SEATS', role: 'A' });
  expect(state.tracks.B.completed).toEqual([]);
});
it.each([
  'LOGOUT',
  'CLOSED',
  'NAVIGATED',
  'STALE',
  'PERMISSION',
  'FAILED',
  'BUDDY_CHANGED',
] as const)(
  'prioritizes explicit %s recovery over routine guidance',
  (problem) => {
    const state = planned();
    state.tracks.B.problem = problem;
    expect(nextMovieNightStep(state)).toMatchObject({
      code: problem,
      role: 'B',
    });
  },
);
it('partial and both-done remain self-reports, expiry becomes UNKNOWN and consecutive seats never become adjacency proof', () => {
  const state = planned();
  seats(state, now);
  for (const role of ['A', 'B'] as const) {
    applyManual(
      state,
      {
        type: 'MANUAL_DETAILS',
        role,
        showtime: state.plan!,
        seat: { row: 'F', number: role === 'A' ? '10' : '11' },
      },
      now,
    );
    review(state, now);
    for (const step of manualSteps)
      applyManual(state, { type: 'ACKNOWLEDGE', role, step }, now);
    expect(nextMovieNightStep(state).code).toBe(
      role === 'A' ? 'PARTIAL' : 'SELF_REPORTED',
    );
  }
  expect(nextMovieNightStep(state).text).toContain('NOT SITE VERIFIED');
  expect(manualSummary(state).adjacency).toBe('CONSECUTIVE_UNVERIFIED');
  state.tracks.B.seat.row = 'G';
  expect(manualSummary(state).adjacency).toBe('NOT_CONSECUTIVE');
  expireManual(state, now + MANUAL_AGE_MS, false);
  expect(nextMovieNightStep(state).code).toBe('STALE');
  expect(state.tracks.A.completed).toEqual([]);
  expect(checkAge(null, now)).toBe('Nog niet zelf gecontroleerd');
  expect(checkAge(now - 120_000, now)).toContain('2 min');
});
