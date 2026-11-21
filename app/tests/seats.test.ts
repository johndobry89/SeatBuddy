import { describe, expect, test } from 'vitest';
import { adjacent, discover, evaluate, touching } from '../src/core/seats';
import { makeMap, makeRow, makeSeat } from './helpers';

const pairs = (map: ReturnType<typeof makeMap>) => discover(map).pairs.map((p) => `${p.row}:${p.seats.join('+')}`);

describe('physical adjacency', () => {
  test('consecutive numbers alone are not enough', () => {
    const row = makeRow(1, 2);
    expect(adjacent(makeMap([row]), { rowIndex: 0, index: 0 })).toBe(true);
    const columnGap = [makeSeat(1, 1, 1, { before: 'END' }), makeSeat(1, 2, 3, { after: 'END' })];
    expect(adjacent(makeMap([columnGap]), { rowIndex: 0, index: 0 })).toBe(false);
    const aisle = [makeSeat(1, 1, 1, { before: 'END', after: 'GAP' }), makeSeat(1, 2, 2, { before: 'GAP', after: 'END' })];
    expect(adjacent(makeMap([aisle]), { rowIndex: 0, index: 0 })).toBe(false);
    const numberJump = [makeSeat(1, 1, 1, { before: 'END' }), makeSeat(1, 3, 2, { after: 'END' })];
    expect(adjacent(makeMap([numberJump]), { rowIndex: 0, index: 0 })).toBe(false);
  });

  test('geometry: gaps, overlap, other line, unequal size and missing layout stop', () => {
    const r = { left: 0, top: 0, width: 20, height: 20 };
    expect(touching(r, { ...r, left: 24 })).toBe(true);
    expect(touching(r, { ...r, left: 27 })).toBe(false); // gap > 30%
    expect(touching(r, { ...r, left: 10 })).toBe(false); // overlap
    expect(touching(r, { ...r, left: 24, top: 10 })).toBe(false);
    expect(touching(r, { ...r, left: 24, width: 30 })).toBe(false);
    expect(touching(r, null)).toBe(false);
    expect(touching(r, { ...r, left: 24, width: 0 })).toBe(false);
  });
});

describe('pair eligibility', () => {
  test('taken, unknown, Ultra Lux and special seats are never offered', () => {
    expect(pairs(makeMap([makeRow(1, 2, { 1: { state: 'unavailable' } })]))).toEqual([]);
    expect(pairs(makeMap([makeRow(1, 2, { 2: { category: null } })]))).toEqual([]);
    expect(pairs(makeMap([makeRow(1, 2, { 1: { category: 'Ultra Lux' } })]))).toEqual([]);
    expect(pairs(makeMap([makeRow(1, 2, { 2: { special: true } })]))).toEqual([]);
    expect(pairs(makeMap([makeRow(1, 2, { 1: { state: 'unknown', category: null } })]))).toEqual([]);
  });

  test('one-seat buffer: unclassified, taken or special direct neighbours stop the pair', () => {
    for (const neighbour of [{ category: null }, { state: 'unavailable' as const }, { special: true }]) {
      const map = makeMap([makeRow(1, 3, { 3: neighbour })]);
      expect(evaluate(map, { rowIndex: 0, index: 0 })).toEqual({ ok: false, reason: 'SPECIAL_NEIGHBOUR' });
    }
    // Across an aisle/column gap the neighbour does not border the pair.
    const row = [makeSeat(1, 1, 1, { before: 'END' }), makeSeat(1, 2, 2), makeSeat(1, 3, 4, { category: null, after: 'END' })];
    expect(evaluate(makeMap([row]), { rowIndex: 0, index: 0 }).ok).toBe(true);
  });

  test('a marked non-seat element next to a pair (possible wheelchair space) stops it (audit F5)', () => {
    const row = makeRow(1, 2, { 2: { after: 'MARKED' } });
    expect(evaluate(makeMap([row]), { rowIndex: 0, index: 0 })).toEqual({ ok: false, reason: 'SPECIAL_NEIGHBOUR' });
    const gap = makeRow(1, 2, { 2: { after: 'GAP' } });
    expect(evaluate(makeMap([gap]), { rowIndex: 0, index: 0 }).ok).toBe(true);
  });
});

describe('ranking', () => {
  test('without a proven screen: page order, never overlapping options (audit F3)', () => {
    const result = discover(makeMap([makeRow(1, 6), makeRow(8, 6)]));
    expect(result.mode).toBe('PAGE_ORDER');
    expect(result.pairs.map((p) => `${p.row}:${p.seats.join('+')}`)).toEqual(['1:1+2', '1:3+4', '1:5+6']);
  });

  test('with the screen above all seats: rear rows and the middle first', () => {
    const screen = { left: 0, top: 0, width: 140, height: 10 };
    const result = discover(makeMap([makeRow(1, 6), makeRow(8, 6)], screen));
    expect(result.mode).toBe('SCREEN');
    expect(result.pairs.map((p) => `${p.row}:${p.seats.join('+')}`)).toEqual(['8:3+4', '8:1+2', '8:5+6']);
  });

  test('a screen below, beside or overlapping the seats proves no orientation', () => {
    for (const screen of [
      { left: 0, top: 400, width: 140, height: 10 },
      { left: 0, top: 0, width: 10, height: 140 },
      { left: 500, top: 0, width: 140, height: 10 },
      { left: 0, top: 35, width: 140, height: 10 },
    ])
      expect(discover(makeMap([makeRow(1, 6), makeRow(8, 6)], screen)).mode).toBe('PAGE_ORDER');
  });

  test('same category before mixed category, and buffer rejections are counted', () => {
    const map = makeMap([
      makeRow(1, 2, { 1: { category: 'Saver Lux' } }),
      makeRow(2, 2),
      makeRow(3, 3, { 3: { category: null } }),
    ]);
    const result = discover(map);
    expect(pairs(map)).toEqual(['2:1+2', '1:1+2']);
    expect(result.bufferRejected).toBe(1);
  });

  test('a map that is not OK yields nothing', () => {
    expect(discover({ ...makeMap([makeRow(1, 4)]), status: 'LEGEND_UNKNOWN' }).pairs).toEqual([]);
  });
});
