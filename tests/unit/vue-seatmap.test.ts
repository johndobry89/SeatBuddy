import { expect, test } from 'vitest';
import { extract } from '../helpers/vue-page-reader';
import { bookingAlpha, quickSelected } from '../fixtures/vue-header';
import {
  fakeIcon,
  fakeLegend,
  fakeMap,
  fixtureGeometry,
  seat,
  seatPage,
} from '../fixtures/vue-seatmap';

const read = (html = seatPage) =>
  extract(html, undefined, fixtureGeometry).seats!;
const pair = { row: 1, seats: [1, 2], categories: ['Lux', 'Lux'] };
const noSeatObservation = (document: Document) => {
  const original = document.querySelectorAll.bind(document);
  document.querySelectorAll = ((selector: string) => {
    if (/seat-map|\.seats\[|button\.seats/.test(selector))
      throw new Error('Seat observation before guard');
    return original(selector);
  }) as typeof document.querySelectorAll;
};

test('bounded four-row snapshot: ARIA status, exact legend, one possible pair, no raw data', () => {
  const result = read();
  expect(result.source).toBe('VISIBLE_LIVE_SEATMAP');
  expect(result.reason).toBe('CHECK_VISUALLY');
  expect(result.counts).toEqual({
    available: 6,
    unavailable: 1,
    picked: 1,
    unknown: 0,
    categoryUnknown: 3,
    ultraLux: 1,
  });
  expect(result.pairs).toEqual([pair]);
  expect(JSON.stringify(result)).not.toMatch(
    /data:|FAKE_|fake-seat|3-not-a-status|https:|data-row/,
  );
  const backwards = seatPage.replace(
    seat(1, 1, 1) + seat(1, 2, 2),
    seat(1, 2, 2) + seat(1, 1, 1),
  );
  expect(read(backwards).pairs[0]?.seats).toEqual([2, 1]);
});

test('rejects span gaps, skipped columns, intervening nodes, aisles, overlap and special placement', () => {
  const first = seat(1, 1, 1),
    second = seat(1, 2, 2);
  for (const cells of [
    first + '<span class="seats__seat"></span>' + second,
    first + second.replace('data-column="2"', 'data-column="4"'),
    first + '<!-- break -->' + second,
    first + second.replace('left:24px', 'left:48px'),
    first + second.replace('left:24px', 'left:10px'),
    first.replace('class="seats__seat"', 'class="seats__seat accessible"') +
      second,
  ])
    expect(read(seatPage.replace(first + second, cells)).pairs).toEqual([]);
  // No actual geometry means counts only, never invent positions from labels.
  expect(extract(seatPage).seats?.pairs).toEqual([]);
});

test('Ultra Lux, unknown icon, picked/unavailable, malformed and disabled contradictions never become candidates', () => {
  for (const replacement of [
    seat(1, 2, 2, 'ultra'),
    seat(1, 2, 2, 'special'),
    seat(1, 2, 2, 'lux', 'picked'),
    seat(1, 2, 2, 'lux', 'unavailable'),
    seat(1, 2, 2).replace('style=', 'disabled style='),
    seat(1, 2, 2).replace('available"', 'reserved"'),
    seat(1, 2, 2).replace(
      'data-test="fake-seat-1-2"',
      'data-test="fake-seat-1-1"',
    ),
  ])
    expect(read(seatPage.replace(seat(1, 2, 2), replacement)).pairs).toEqual(
      [],
    );
});

test('missing, mismatched, hidden or duplicate legend never guesses category or inherits earlier result', () => {
  expect(read().pairs).toEqual([pair]);
  for (const legend of [
    '',
    fakeLegend.replace(fakeIcon('lux'), fakeIcon('mismatch')),
    fakeLegend.replace(fakeIcon('saver'), fakeIcon('lux')),
    fakeLegend.replace('Lux stoelen', 'Premium stoelen'),
    fakeLegend.replace(
      'class="seats-category"',
      'hidden class="seats-category"',
    ),
    fakeLegend + fakeLegend,
  ]) {
    const result = read(bookingAlpha + legend + fakeMap);
    expect(result.pairs).toEqual([]);
    expect(result.counts?.categoryUnknown).toBeGreaterThanOrEqual(4);
  }
});

test('protected or incomplete context performs no seat observation; hidden/duplicate/oversized maps stop', () => {
  for (const html of [
    seatPage + '<section class="checkout">DO NOT READ</section>',
    seatPage + '<form><input autocomplete="cc-number"></form>',
    seatPage + '<dialog open>DO NOT READ</dialog>',
    seatPage.replace(
      'data-test="screen-title">Zaal 2',
      'data-test="screen-title">Zaal 5',
    ),
    seatPage.replace('>19:30<', '>21:30<'),
    seatPage.replace('2030-04-12T19:30:00', '2030-02-30T19:30:00'),
    seatPage.replace('data-test="booking-hero"', 'data-test="unknown"'),
    seatPage + bookingAlpha,
    quickSelected + fakeMap,
  ])
    expect(
      extract(html, undefined, noSeatObservation).seats?.counts ?? null,
    ).toBeNull();
  for (const map of [
    fakeMap + fakeMap,
    fakeMap.replace('class="seat-map', 'hidden class="seat-map'),
    fakeMap.replace(seat(1, 1, 1), seat(1, 1, 1).repeat(500)),
  ]) {
    expect(read(bookingAlpha + fakeLegend + map).counts).toBeNull();
  }
});

test('at most three pairs, same category first, no fee/booking promise', () => {
  const extra = fakeMap
    .replace(
      seat(2, 1, 5) + '<span class="seats__seat"></span>' + seat(2, 2, 3),
      seat(2, 1, 1) + seat(2, 2, 2),
    )
    .replace(
      seat(3, 1, 1, 'ultra') + seat(3, 2, 2, 'special'),
      seat(3, 1, 1, 'saver') + seat(3, 2, 2, 'saver'),
    )
    .replace(
      seat(4, 1, 1, 'lux', 'picked') + seat(4, 2, 2, 'lux', 'unavailable'),
      seat(4, 1, 1, 'super') + seat(4, 2, 2, 'super'),
    )
    .replace(seat(1, 2, 2), seat(1, 2, 2, 'saver'));
  expect(
    read(bookingAlpha + fakeLegend + extra).pairs.map((pair) => pair.row),
  ).toEqual([2, 3, 4]);
});
