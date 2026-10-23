import { expect, test } from 'vitest';
import { extract } from '../helpers/vue-page-reader';
import { fixtureGeometry, seat, fakeLegend } from '../fixtures/vue-seatmap';
import { dynamicLuxPage } from '../fixtures/vue-legend';
import { formatReadReport } from '../../src/experiment/read-report';

// Only invented references. Every category shares a path; the complete opaque
// query distinguishes identities. No original URL, asset or 105-seat imitation.
const icon = (key: string) =>
  `https://www.vuecinemas.nl/other-path/icon?revision=demo&kind=${key}`;
const page =
  dynamicLuxPage.replace(
    /(?:https:\/\/www.vuecinemas.nl)?\/public-icons\/fake-([a-z]+)\.svg/g,
    (_, key: string) => icon(key),
  ) +
  fakeLegend.replace(
    /data:image\/png;base64,FAKE_([a-z]+)/g,
    (_, key: string) => icon(key),
  );
const read = (html = page, prepare = fixtureGeometry) =>
  extract(html, undefined, prepare);

test('same-origin opaque paths/queries classify exactly; two unknown available seats do not block a known pair', () => {
  const extra = seat(3, 3, 3, 'special2').replace(
    'data:image/png;base64,FAKE_special2',
    icon('special2'),
  );
  const special = seat(3, 2, 2, 'special').replace(
    'data:image/png;base64,FAKE_special',
    icon('special'),
  );
  const result = read(page.replace(special, special + extra));
  expect(result.seats).toMatchObject({
    scheme: 'LUX_4',
    categoryEvidence: 'EXACT_VISIBLE_ICON',
    counts: { categoryUnknownAvailable: 2, ultraLuxAvailable: 1 },
  });
  expect(result.seats?.pairs).toEqual([
    { row: 1, seats: [1, 2], categories: ['Lux', 'Lux'] },
  ]);
  expect(JSON.stringify(result) + formatReadReport(result)).not.toMatch(
    /https:|other-path|revision=|kind=|data:|FAKE_/,
  );
});

test('query identity is never stripped, reordered or decoded into a match', () => {
  for (const query of [
    'revision=other&kind=lux',
    'kind=lux&revision=demo',
    'revision=demo&kind=%6Cux',
  ]) {
    const result = read(page, (document) => {
      fixtureGeometry(document);
      for (const image of document.querySelectorAll('button.seats__seat img')) {
        if (image.getAttribute('src') === icon('lux'))
          image.setAttribute(
            'src',
            `https://www.vuecinemas.nl/other-path/icon?${query}`,
          );
      }
    });
    expect(result.seats).toMatchObject({
      diagnostic: 'SEAT_ICON_NO_MATCH',
      pairs: [],
    });
  }
});

test('cross-origin, credentials, fragments, unsafe/placeholder references and conflicting currentSrc stay unknown', () => {
  for (const unsafe of [
    'https://example.test/other-path/icon?revision=demo',
    'http://www.vuecinemas.nl/other-path/icon?revision=demo',
    'https://user:pass@www.vuecinemas.nl/other-path/icon',
    `${icon('lux')}#part`,
    'blob:demo',
    'javascript:demo',
    'data:text/html,demo',
    ' ',
    '#',
    'null',
  ]) {
    expect(read(page.replace(icon('lux'), unsafe)).seats).toMatchObject({
      diagnostic: 'LEGEND_ICON_TYPE',
      pairs: [],
    });
  }
  const result = read(page, (document) => {
    fixtureGeometry(document);
    for (const image of document.querySelectorAll('button.seats__seat img'))
      Object.defineProperty(image, 'currentSrc', { value: icon('saver') });
  });
  expect(result.seats).toMatchObject({
    diagnostic: 'SEAT_ICON_NO_MATCH',
    pairs: [],
  });
});
