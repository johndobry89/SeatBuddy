import { describe, expect, it } from 'vitest';
import { matchShowtimes } from '../../src/core/showtime-matcher';
import { adjacent } from '../../src/core/seats';
import { fictionalObservation } from '../../src/fixtures/data';
import { Coordinator } from '../../src/background/coordinator';
import { MAX_AGE_MS } from '../../src/core/types';

const now = 100_000;
const showtime = fictionalObservation('A', now).showtime;
describe('strict showtime matching', () => {
  it('matches only complete equal fields', () =>
    expect(matchShowtimes(showtime, { ...showtime })).toBe('MATCH'));
  it.each(['cinema', 'movie', 'date', 'time', 'hall'] as const)(
    'rejects a different %s',
    (field) => {
      expect(
        matchShowtimes(showtime, { ...showtime, [field]: 'different' }),
      ).toBe('MISMATCH');
    },
  );
  it.each(['cinema', 'movie', 'date', 'time', 'hall'] as const)(
    'keeps missing %s UNKNOWN',
    (field) => {
      expect(matchShowtimes(showtime, { ...showtime, [field]: null })).toBe(
        'UNKNOWN',
      );
    },
  );
  it('does not match absent observations or guess titles', () => {
    expect(matchShowtimes(null, showtime)).toBe('UNKNOWN');
    expect(
      matchShowtimes(showtime, { ...showtime, movie: 'De maan van papier 2' }),
    ).toBe('MISMATCH');
  });
});
describe('seat topology', () => {
  const a = fictionalObservation('A', now).seat!;
  const b = fictionalObservation('B', now).seat!;
  it('recognises only fictional neighbours in the same block', () =>
    expect(adjacent(a, b)).toBe('MOCK_ADJACENT'));
  it.each([
    { section: 'across aisle' },
    { hall: 'Zaal 3' },
    { row: 'G' },
    { category: 'PREMIUM' as const },
    { position: 9 },
    { label: a.label },
  ])('rejects geometry/category mismatch %j', (change) =>
    expect(adjacent(a, { ...b, ...change })).toBe('NOT_ADJACENT'),
  );
  it('keeps missing geometry UNKNOWN', () =>
    expect(adjacent(a, null)).toBe('UNKNOWN'));
});
describe('independent simulation state', () => {
  it('starts UNKNOWN and never promotes a real confirmation', () => {
    const c = new Coordinator();
    expect(c.snapshot(now, false).sessions.A.observation).toBeNull();
    c.demo('partial', now);
    const state = c.snapshot(now, false);
    expect(state.sessions.A.observation?.status).toBe('SIMULATED_COMPLETE');
    expect(state.sessions.B.observation?.status).toBe('FAILED');
    expect(state.nextStep).toContain('Partiële simulatie');
    expect(JSON.stringify(state)).not.toContain('CONFIRMED');
  });
  it('expires observations at the boundary and removes derived match/seat evidence', () => {
    const c = new Coordinator();
    c.demo('matching', now);
    expect(c.snapshot(now + MAX_AGE_MS - 1, true).match).toBe('MATCH');
    const state = c.snapshot(now + MAX_AGE_MS, true);
    expect(state.match).toBe('UNKNOWN');
    expect(state.adjacency).toBe('UNKNOWN');
    expect(state.sessions.A.evidence).toBe('NONE');
  });
  it('keeps the current independent A status when B is stale', () => {
    const c = new Coordinator();
    c.demo('stale', now);
    const state = c.snapshot(now, true);
    expect(state.sessions.A.observation?.status).toBe('SELECTED');
    expect(state.sessions.B.observation).toBeNull();
  });
  it('worker restart and reset discard state without replaying actions', () => {
    const first = new Coordinator();
    first.demo('partial', now);
    const restarted = new Coordinator();
    expect(restarted.snapshot(now, true).mode).toBe('MANUAL');
    expect(restarted.sessions).toEqual(new Coordinator().sessions);
    first.reset();
    expect(first.sessions).toEqual(restarted.sessions);
  });
  it('snapshots cannot mutate coordinator state', () => {
    const c = new Coordinator();
    c.demo('matching', now);
    c.snapshot(now, true).sessions.A.observation!.status = 'FAILED';
    expect(c.sessions.A.observation?.status).toBe('SELECTED');
  });
});

describe('per-role demo transitions', () => {
  it('advances A alone without changing B or creating real confirmation', () => {
    const c = new Coordinator();
    c.demo('matching', now);
    expect(c.advanceDemo('A', now + 1)).toBe(true);
    expect(c.sessions.A.observation?.status).toBe('REVIEW_REQUIRED');
    expect(c.sessions.B.observation?.status).toBe('SELECTED');
    expect(c.advanceDemo('A', now + 2)).toBe(true);
    expect(c.sessions.A.observation?.status).toBe('SIMULATED_COMPLETE');
    expect(c.advanceDemo('A', now + 3)).toBe(false);
    expect(c.sessions.B.observation?.status).toBe('SELECTED');
  });
  it('cannot advance stale, failed or manual state', () => {
    const c = new Coordinator();
    expect(c.advanceDemo('A', now)).toBe(false);
    c.demo('stale', now);
    expect(c.advanceDemo('B', now)).toBe(false);
    c.demo('partial', now);
    expect(c.advanceDemo('B', now)).toBe(false);
  });
  it('does not imply adjacency when seat hall contradicts the showtime', () => {
    const c = new Coordinator();
    c.demo('matching', now);
    c.sessions.A.observation!.seat!.hall = 'Different hall';
    c.sessions.B.observation!.seat!.hall = 'Different hall';
    expect(c.snapshot(now, true).adjacency).toBe('UNKNOWN');
  });
});
