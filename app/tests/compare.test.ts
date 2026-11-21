import { describe, expect, test } from 'vitest';
import { checkProposal } from '../src/core/compare';
import type { Proposal } from '../src/core/message';
import type { Observation } from '../src/core/types';
import { makeMap, makeRow } from './helpers';

const showing = { movie: 'Ebenezer', cinema: 'Vue Enschede', date: '2026-11-22', time: '18:40', hall: 'Zaal 6' };
const proposal: Proposal = { showing, row: 1, sender: 2, receiver: 3, categories: ['Lux', 'Lux'], readAt: '12:47' };
const observation = (rows = [makeRow(1, 6)], extra: Partial<Observation> = {}): Observation => ({
  status: 'OK',
  observedAt: 1,
  showing,
  map: makeMap(rows),
  ...extra,
});

describe("B's own live check", () => {
  test('exact pair free and adjacent, also when it is not in B’s own top three', () => {
    const rows = [makeRow(1, 6), makeRow(5, 6), makeRow(6, 6), makeRow(7, 6)];
    expect(checkProposal(proposal, observation(rows))).toEqual({ kind: 'FREE', row: 1, mine: 3, theirs: 2 });
  });

  test('strict showtime mismatch names every differing field; case/space differences are equal', () => {
    const seen = { ...showing, time: '21:00', hall: 'Zaal 7', movie: ' ebenezer ' };
    expect(checkProposal(proposal, observation(undefined, { showing: seen }))).toEqual({ kind: 'OTHER_SHOWING', differences: ['time', 'hall'] });
  });

  test('page or map not OK never yields a positive outcome', () => {
    expect(checkProposal(proposal, observation(undefined, { status: 'PROTECTED', map: null }))).toEqual({ kind: 'UNKNOWN', reason: 'PAGE' });
    expect(checkProposal(proposal, { ...observation(), map: { ...makeMap([makeRow(1, 6)]), status: 'LEGEND_UNKNOWN' } })).toEqual({ kind: 'UNKNOWN', reason: 'MAP' });
  });

  test('changed availability', () => {
    expect(checkProposal(proposal, observation([makeRow(1, 6, { 3: { state: 'unavailable' } })])).kind).toBe('MINE_TAKEN');
    // Partner already chose their seat: a useful, honest intermediate state.
    expect(checkProposal(proposal, observation([makeRow(1, 6, { 2: { state: 'unavailable' } })]))).toEqual({
      kind: 'PARTNER_SEAT_TAKEN', row: 1, mine: 3, theirs: 2,
    });
    expect(checkProposal(proposal, observation([makeRow(1, 6, { 3: { state: 'picked', category: null } })])).kind).toBe('MINE_ALREADY_SELECTED');
    expect(checkProposal(proposal, observation([makeRow(1, 6, { 2: { state: 'picked', category: null } })])).kind).toBe('PARTNER_SEAT_SELECTED_BY_YOU');
    expect(checkProposal(proposal, observation([makeRow(1, 6, { 2: { state: 'unknown', category: null } })]))).toEqual({ kind: 'UNKNOWN', reason: 'SEAT_STATE' });
  });

  test('aisle, seat type, category change and buffer stop, even with the partner seat taken', () => {
    const gap = makeRow(1, 6);
    gap[1]!.after = 'GAP';
    gap[2]!.before = 'GAP';
    expect(checkProposal(proposal, observation([gap]))).toEqual({ kind: 'UNSAFE', reason: 'NOT_ADJACENT' });
    expect(checkProposal(proposal, observation([makeRow(1, 6, { 3: { category: 'Ultra Lux' } })]))).toEqual({ kind: 'UNSAFE', reason: 'ULTRA_LUX' });
    expect(checkProposal(proposal, observation([makeRow(1, 6, { 3: { category: 'Saver Lux' } })]))).toEqual({ kind: 'UNSAFE', reason: 'CATEGORY_CHANGED' });
    expect(checkProposal(proposal, observation([makeRow(1, 6, { 4: { category: null } })]))).toEqual({ kind: 'UNSAFE', reason: 'SPECIAL_NEIGHBOUR' });
    expect(checkProposal(proposal, observation([makeRow(1, 6, { 2: { state: 'unavailable' }, 3: { special: true } })]))).toEqual({ kind: 'UNSAFE', reason: 'SPECIAL' });
  });

  test('seats that are not on B’s map, or not next to each other there', () => {
    expect(checkProposal({ ...proposal, row: 9 }, observation())).toEqual({ kind: 'UNKNOWN', reason: 'SEAT_NOT_FOUND' });
    const swapped = makeRow(1, 6);
    [swapped[1], swapped[4]] = [swapped[4]!, swapped[1]!];
    expect(checkProposal(proposal, observation([swapped]))).toEqual({ kind: 'UNSAFE', reason: 'NOT_ADJACENT' });
  });

  test('sender seat right of receiver works (DOM order independent)', () => {
    expect(checkProposal({ ...proposal, sender: 4, receiver: 3 }, observation()).kind).toBe('FREE');
  });
});
