import { expect, test } from 'vitest';
import { createDuoPlan } from '../../src/experiment/vue-page-reader';
import { parseDuoPlan } from '../../src/experiment/duo-plan';
import { extract } from '../helpers/vue-page-reader';
import { rearCenterPage, rankingGeometry } from '../fixtures/vue-ranking';
import { seat } from '../fixtures/vue-seatmap';

const read = (html = rearCenterPage()) =>
  extract(html, undefined, rankingGeometry);

test('reverse labels 6→1 and 8→1: physical rear and center win, independent of DOM order', () => {
  for (const front of [6, 8]) {
    const html = rearCenterPage(front);
    const expected = { row: 1, seats: [4, 5], categories: ['Lux', 'Lux'] };
    expect(read(html).seats?.pairs[0]).toEqual(expected);
    const shuffled = extract(html, undefined, (document) => {
      const map = document.querySelector('[data-test="seats"]')!;
      map.append(...[...map.children].reverse());
      rankingGeometry(document);
    });
    expect(shuffled.seats?.pairs).toEqual(read(html).seats?.pairs);
  }
});

test('true room center before category preference; deterministic ties and three nonoverlapping options', () => {
  const html = rearCenterPage().replace(seat(1, 5, 5), seat(1, 5, 5, 'saver'));
  const pairs = read(html).seats!.pairs;
  expect(pairs[0]).toEqual({
    row: 1,
    seats: [4, 5],
    categories: ['Lux', 'Saver Lux'],
  });
  expect(pairs).toHaveLength(3);
  expect(new Set(pairs.flatMap((p) => p.seats)).size).toBe(6);
  expect(read(html).seats?.pairs).toEqual(pairs);
  // Seven seats: 3+4 and 4+5 are equally central; equal categories break the tie.
  const tied = rearCenterPage(6, 7).replace(
    seat(1, 3, 3),
    seat(1, 3, 3, 'saver'),
  );
  expect(read(tied).seats?.pairs[0]?.seats).toEqual([4, 5]);
});

test('missing, side-on, overlapping or invalid screen geometry preserves the stable fallback', () => {
  const html = rearCenterPage();
  const expected = [
    [1, 2],
    [2, 3],
    [3, 4],
  ];
  for (const variant of [
    html.replace(/<h2[^>]*>.*?<\/h2>/, ''),
    html.replace('<h2 data-test=', '<h2 hidden data-test='),
    html.replace('left:0;top:0;width:188px', 'left:300px;top:0;width:188px'),
    html.replace('top:0;width:188px', 'top:80px;width:188px'),
    html.replace(
      'top:0;width:188px;height:20px',
      'top:0;width:0px;height:20px',
    ),
  ]) {
    expect(read(variant).seats?.pairs.map((p) => p.seats)).toEqual(expected);
    expect(read(variant).seats?.pairs[0]?.row).toBe(6);
  }
  const outside = extract(html, undefined, (document) => {
    document.body.prepend(
      document.querySelector('[data-test="screen-title"]')!,
    );
    rankingGeometry(document);
  });
  // DOM ancestry alone says nothing about screen position; unchanged measured
  // geometry still proves the same orientation, even outside the scaled scene.
  expect(outside.seats?.pairs).toEqual(read(html).seats?.pairs);
  const invalid = extract(html, undefined, (document) => {
    rankingGeometry(document);
    const screen = document.querySelector('[data-test="screen-title"]')!;
    const rect = screen.getBoundingClientRect();
    screen.getBoundingClientRect = () => ({ ...rect, top: NaN });
  });
  expect(invalid.seats?.pairs.map((p) => p.seats)).toEqual(expected);
  // Duplicate room headings already fail the existing context guard, not ranking.
  expect(
    read(html + '<h2 data-test="screen-title">Zaal 2</h2>').seats?.pairs,
  ).toEqual([]);
});

test('rear ranking never weakens UNKNOWN/special buffers or Ultra exclusions; B verifies any safe exact target', () => {
  const clean = rearCenterPage();
  // First visible/front pair is outside the newly ranked rear shortlist.
  const front = extract(
    clean.replace(/<h2[^>]*>.*?<\/h2>/, ''),
    undefined,
    rankingGeometry,
  );
  const target = parseDuoPlan(createDuoPlan(front, 0));
  expect(read(clean).seats?.pairs.every((p) => p.row === 1)).toBe(true);
  expect(extract(clean, undefined, rankingGeometry, target).duo).toBe(
    'DUO_MATCH_POSSIBLE',
  );
  for (const replacement of [
    seat(1, 6, 6, 'special'),
    seat(1, 6, 6).replace(
      'class="seats__seat"',
      'class="seats__seat wheelchair"',
    ),
  ]) {
    const unsafe = clean.replace(seat(1, 6, 6), replacement);
    expect(
      read(unsafe).seats?.pairs.some((p) => p.row === 1 && p.seats.includes(5)),
    ).toBe(false);
    const rearTarget = parseDuoPlan(createDuoPlan(read(clean), 0));
    expect(extract(unsafe, undefined, rankingGeometry, rearTarget).duo).toBe(
      'UNKNOWN_STOP',
    );
  }
  const ultra = clean.replace(seat(1, 4, 4), seat(1, 4, 4, 'ultra'));
  expect(
    read(ultra).seats?.pairs.some((p) => p.row === 1 && p.seats.includes(4)),
  ).toBe(false);
});
