import { expect, test } from 'vitest';
import { createDuoPlan } from '../../src/experiment/vue-page-reader';
import { parseDuoPlan } from '../../src/experiment/duo-plan';
import { extract } from '../helpers/vue-page-reader';
import { bookingAlpha } from '../fixtures/vue-header';
import { fakeLegend, fixtureGeometry, seat } from '../fixtures/vue-seatmap';

const row = (n: number, cells: string) =>
  `<div class="seats__row" data-test="seats-row-${n}" style="position:relative;height:24px">${cells}</div>`;
const page = (rows: string) =>
  `${bookingAlpha}${fakeLegend}<div class="seat-map__scaled-scene"><div class="seats" data-test="seats">${rows}</div></div>`;
const read = (html: string) => extract(html, undefined, fixtureGeometry);
const check = (html: string, clean: string) =>
  extract(
    html,
    undefined,
    fixtureGeometry,
    parseDuoPlan(createDuoPlan(read(clean), 0)),
  ).duo;
const pair = seat(1, 2, 2) + seat(1, 3, 3, 'saver');
const clean = page(row(1, pair));

test('both sides: UNKNOWN or explicit special neighbours block A and B, regardless of availability', () => {
  for (const side of ['left', 'right']) {
    const n = side === 'left' ? 1 : 4;
    const variants = [
      seat(1, n, n, 'special'),
      seat(1, n, n, 'lux', 'picked'),
      seat(1, n, n, 'lux', 'unavailable'),
      ...['wheelchair', 'companion', 'special'].map((mark) =>
        seat(1, n, n).replace(
          'class="seats__seat"',
          `class="seats__seat ${mark}"`,
        ),
      ),
    ];
    for (const neighbour of variants) {
      const html = page(
        row(1, side === 'left' ? neighbour + pair : pair + neighbour),
      );
      expect(read(html).seats?.pairs).toEqual([]);
      expect(check(html, clean)).toBe('UNKNOWN_STOP');
    }
  }
});

test('buffer stops at DOM gaps, large aisles, column breaks and other physical rows', () => {
  const unknown = seat(1, 1, 1, 'special');
  const cases = [
    page(row(1, unknown + '<span class="seats__seat"></span>' + pair)),
    page(row(1, unknown + '<!-- aisle -->' + pair)),
    page(row(1, unknown + seat(1, 2, 4) + seat(1, 3, 5, 'saver'))),
    page(row(1, unknown.replace('data-column="1"', 'data-column="0"') + pair)),
    page(row(1, pair) + row(2, seat(2, 1, 1, 'special'))),
  ];
  for (const html of cases) {
    expect(read(html).seats?.pairs).toContainEqual({
      row: 1,
      seats: [2, 3],
      categories: ['Lux', 'Saver Lux'],
    });
    expect(check(html, clean)).toBe('DUO_MATCH_POSSIBLE');
  }
  // Removing the boundary really makes this unsafe; no broad row ban or blanket refusal.
  expect(read(page(row(1, unknown + pair))).seats?.pairs).toEqual([]);
});

test('exact B target outside top three cannot bypass buffer; ordinary pairs one seat farther remain', () => {
  const target = page(row(1, seat(1, 5, 5) + seat(1, 6, 6)));
  const html = page(
    row(
      1,
      Array.from({ length: 7 }, (_, i) =>
        seat(1, i + 1, i + 1, i === 6 ? 'special' : 'lux'),
      ).join(''),
    ),
  );
  expect(read(html).seats?.pairs.map((p) => p.seats)).toEqual([
    [1, 2],
    [2, 3],
    [3, 4],
  ]);
  expect(check(html, target)).toBe('UNKNOWN_STOP');
  const safe = page(row(1, seat(1, 3, 3) + seat(1, 4, 4)));
  expect(check(html, safe)).toBe('DUO_MATCH_POSSIBLE');
});
