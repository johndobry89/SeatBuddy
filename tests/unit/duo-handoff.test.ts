import { expect, test } from 'vitest';
import { createDuoPlan } from '../../src/experiment/vue-page-reader';
import {
  DUO_TTL_MS,
  formatDuoPlan,
  parseDuoPlan,
} from '../../src/experiment/duo-plan';
import { extract } from '../helpers/vue-page-reader';
import { fixtureGeometry, seat } from '../fixtures/vue-seatmap';
import { duoPage } from '../fixtures/duo-handoff';
import { bookingAlpha } from '../fixtures/vue-header';

const read = (html = duoPage(true)) =>
  extract(html, undefined, fixtureGeometry);
const share = () => createDuoPlan(read(), 0);
const verify = (html = duoPage(), text = share()) =>
  extract(html, undefined, fixtureGeometry, parseDuoPlan(text));

test('only an explicit current pair creates a bounded canonical public A/B plan', () => {
  const observation = read();
  for (const index of [-1, NaN, 0.5, 3])
    expect(() => createDuoPlan(observation, index)).toThrow();
  const text = createDuoPlan(observation, 0);
  const plan = parseDuoPlan(text);
  expect(text.length).toBeLessThanOrEqual(700);
  expect(formatDuoPlan(plan)).toBe(text);
  expect(plan).toMatchObject({
    source: 'OWNER_VISIBLE_PAGE',
    state: 'NOT_BOOKED',
    pair: { row: 1, A: 5, B: 6, categories: ['Lux', 'Lux'] },
  });
  expect(text).not.toMatch(
    /https?:|data:|FAKE_|data-test|account|price|token|@/,
  );
  const reversed = duoPage(true).replace(
    seat(1, 5, 5) + seat(1, 6, 6),
    seat(1, 6, 6) + seat(1, 5, 5),
  );
  expect(parseDuoPlan(createDuoPlan(read(reversed), 0)).pair).toMatchObject({
    A: 6,
    B: 5,
  });
  for (const movie of [
    'https://private.example/path',
    'account: hidden',
    'hello\nsecret',
    '<script>',
    'a@b.test',
  ]) {
    expect(() =>
      formatDuoPlan({ ...plan, showing: { ...plan.showing, movie } }),
    ).toThrow();
  }
  for (const invalid of [
    text + ' ',
    text.replace('"version": 1,', '"version": 1, "version": 1,'),
    text.replace('"NOT_BOOKED"', '"CONFIRMED"'),
    text.replace('"Lux"', '"Ultra Lux"'),
    text.replace('"pair": {', '"price": 0, "pair": {'),
    'x'.repeat(701),
  ]) {
    expect(() => parseDuoPlan(invalid)).toThrow();
  }
});

test('B verifies exactly A’s received pair outside B’s top three, returning no unrelated map or identity', () => {
  expect(read(duoPage()).seats?.pairs.map((pair) => pair.seats)).toEqual([
    [1, 2],
    [2, 3],
    [3, 4],
  ]);
  const result = verify();
  expect(result.duo).toBe('DUO_MATCH_POSSIBLE');
  expect(result.seats).toBeUndefined();
  expect(JSON.stringify(result)).not.toMatch(
    /FAKE_|data:|https:|seats|counts|fake-seat/,
  );
});

test('every showing field must match; missing, duplicate and protected contexts stop before inspecting seats', () => {
  const verifyWithoutMap = (html: string) =>
    extract(
      html,
      undefined,
      (document) => {
        fixtureGeometry(document);
        const query = document.querySelectorAll.bind(document);
        document.querySelectorAll = ((selector: string) => {
          if (/seat-map|\.seats\[|button\.seats/.test(selector))
            throw new Error('Unexpected map access before showing guard');
          return query(selector);
        }) as typeof document.querySelectorAll;
      },
      parseDuoPlan(share()),
    );
  for (const [from, to] of [
    ['Demo Alpha', 'Demo Beta'],
    ['Vue Teststad', 'Vue Andere stad'],
    ['2030-04-12T19:30:00">vr 12 apr', '2030-04-13T19:30:00">za 13 apr'],
    ['19:30', '20:30'],
    ['Zaal 2', 'Zaal 3'],
  ]) {
    expect(verifyWithoutMap(duoPage().replaceAll(from!, to!)).duo).toBe(
      'MISMATCH_SHOWING',
    );
  }
  for (const html of [
    duoPage().replace('data-test="booking-hero"', 'data-test="unknown"'),
    duoPage() + '<dialog open>DO NOT READ</dialog>',
    duoPage() + bookingAlpha,
    duoPage().replace(
      'data-test="booking-hero-cinema-screen-name"',
      'data-test="unknown"',
    ),
  ]) {
    expect(verifyWithoutMap(html).duo).toBe('UNKNOWN_STOP');
  }
});

test('occupied, changed category, Ultra, unknown, gap, column, overlap and special places never match', () => {
  const original = seat(1, 6, 6);
  for (const state of ['unavailable', 'picked']) {
    expect(
      verify(duoPage().replace(original, seat(1, 6, 6, 'lux', state))).duo,
    ).toBe('PAIR_UNAVAILABLE');
  }
  for (const replacement of [
    seat(1, 6, 6, 'saver'),
    seat(1, 6, 6, 'ultra'),
    seat(1, 6, 6, 'special'),
    '<span></span>' + original,
    '<!-- break -->' + original,
    original.replace('data-column="6"', 'data-column="7"'),
    original.replace('left:120px', 'left:144px'),
    original.replace('left:120px', 'left:100px'),
    original.replace('class="seats__seat"', 'class="seats__seat accessible"'),
  ]) {
    expect(verify(duoPage().replace(original, replacement)).duo).toBe(
      'UNKNOWN_STOP',
    );
  }
});

test('stale/future plans and changed or incomplete observations cannot inherit prior evidence', () => {
  const observation = read();
  const now = observation.observedAt;
  const text = createDuoPlan(observation, 0, now);
  expect(() => parseDuoPlan(text, now + DUO_TTL_MS - 1)).not.toThrow();
  expect(() => parseDuoPlan(text, now + DUO_TTL_MS)).toThrow();
  expect(() => parseDuoPlan(text, now - 1)).toThrow();
  const old = parseDuoPlan(text, now);
  old.observedAt = Date.now() - DUO_TTL_MS;
  expect(extract(duoPage(), undefined, fixtureGeometry, old).duo).toBe(
    'UNKNOWN_STOP',
  );
  for (const html of [
    duoPage().replaceAll('seats-category__title', 'unknown'),
    duoPage().replace(seat(1, 6, 6), ''),
  ]) {
    expect(verify(html).duo).toBe('UNKNOWN_STOP');
  }
  expect(() =>
    createDuoPlan(
      { ...observation, seats: { ...observation.seats, observedAt: now - 1 } },
      0,
    ),
  ).toThrow();
});
