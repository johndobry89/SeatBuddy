import { expect, test, vi } from 'vitest';
import { extract } from '../helpers/vue-page-reader';
import { fixtureGeometry, fakeIcon, fakeLegend } from '../fixtures/vue-seatmap';
import {
  dynamicLuxPage,
  dynamicRankPage,
  dataLegendPage,
  fixtureIconPath,
} from '../fixtures/vue-legend';
import { quickBlank } from '../fixtures/vue-header';
import { formatReadReport } from '../../src/experiment/read-report';
const read = (html: string, prepare = fixtureGeometry) =>
  extract(html, undefined, prepare);

test('two observed title schemes share exact normalized image equality, no city routing or fee inference', () => {
  for (const page of [
    dynamicLuxPage,
    dataLegendPage,
    dataLegendPage + fakeLegend,
  ]) {
    const s = read(page).seats!;
    expect(s.scheme).toBe('LUX_4');
    expect(s.pairs).toEqual([
      { row: 1, seats: [1, 2], categories: ['Lux', 'Lux'] },
    ]);
    expect(s.counts).toMatchObject({
      categoryUnknownAvailable: 1,
      ultraLuxAvailable: 1,
    });
  }
  const rank = read(dynamicRankPage);
  expect(rank.fields.hall.value).toBe('Zaal 6 Dolby Cinema');
  expect(rank.seats).toMatchObject({
    scheme: 'RANK_3',
    categoryEvidence: 'EXACT_VISIBLE_ICON',
    diagnostic: 'SEAT_ICON_NO_MATCH',
    counts: { available: 6, categoryUnknownAvailable: 2, ultraLuxAvailable: 0 },
  });
  expect(rank.seats?.pairs[0]?.categories).toEqual(['Regular', 'Regular']);
  expect(formatReadReport(rank)).toContain(
    'Movie Pass-bijbetaling niet gecontroleerd',
  );
  expect(formatReadReport(rank)).not.toMatch(/€|Rang 1|€0|kosteloos/);
});

test('Dolby hall mismatch/missing heading and a third or partial category scheme fail closed', () => {
  expect(
    read(
      dynamicRankPage.replace(
        'data-test="screen-title">Zaal 6',
        'data-test="screen-title">Zaal 7',
      ),
    ).seats?.counts,
  ).toBeNull();
  expect(
    read(dynamicRankPage.replace(/<h2 data-test="screen-title">.*?<\/h2>/, ''))
      .fields.hall.status,
  ).toBe('UNKNOWN');
  for (const html of [
    dynamicRankPage.replace('>Regular<', '>Premium<'),
    dynamicRankPage.replace('>Saver<', '>Regular<'),
    dynamicRankPage.replace(
      'class="seat-map-legend-list__item--dynamic"',
      'hidden class="seat-map-legend-list__item--dynamic"',
    ),
  ]) {
    expect(read(html).seats).toMatchObject({ scheme: 'UNKNOWN', pairs: [] });
  }
});

test('unsafe or conflicting icon references and duplicate/missing images yield safe diagnostic codes', () => {
  for (const icon of [
    'https://example.test/public-icons/lux.svg',
    'https://user:pass@www.vuecinemas.nl/public-icons/lux.svg',
    'blob:fake',
    'javascript:alert(1)',
    'data:text/html,private',
  ]) {
    const result = read(dynamicLuxPage.replace(fixtureIconPath('lux'), icon));
    expect(result.seats).toMatchObject({
      diagnostic: 'LEGEND_ICON_TYPE',
      pairs: [],
    });
    expect(JSON.stringify(result)).not.toContain(icon);
  }
  // Same-origin paths/queries are opaque identities now; differing references
  // remain unmatched rather than being rejected by path-name heuristics.
  for (const icon of [
    '/public-icons/fake-lux.svg?revision=different',
    '/account/fake-lux.svg',
  ]) {
    expect(
      read(dynamicLuxPage.replace(fixtureIconPath('lux'), icon)).seats,
    ).toMatchObject({ diagnostic: 'SEAT_ICON_NO_MATCH', pairs: [] });
  }
  expect(
    read(dataLegendPage.replace(fakeIcon('saver'), fakeIcon('lux'))).seats
      ?.diagnostic,
  ).toBe('LEGEND_DUPLICATE_ICON');
  expect(
    read(
      dynamicLuxPage.replace(
        `<img src="${fixtureIconPath('lux')}" width="16" height="16">`,
        '',
      ),
    ).seats?.diagnostic,
  ).toBe('LEGEND_IMAGE_MISSING');
  const mismatched = read(dynamicLuxPage, (document) => {
    fixtureGeometry(document);
    for (const image of document.querySelectorAll('button.seats__seat img'))
      Object.defineProperty(image, 'currentSrc', {
        value: `https://www.vuecinemas.nl${fixtureIconPath('saver')}`,
      });
  });
  expect(mismatched.seats).toMatchObject({
    diagnostic: 'SEAT_ICON_NO_MATCH',
    pairs: [],
  });
});

test('copy report is exact allowlisted plaintext with unknown fields and deterministic local observation time', () => {
  const result = extract(quickBlank);
  result.observedAt = new Date(2030, 3, 12, 19, 30).getTime();
  expect(formatReadReport(result)).toBe(
    [
      'SeatBuddies 0.11.6-experimental',
      `Waargenomen (lokale tijd): ${new Date(result.observedAt).toLocaleString('nl-NL', { hour12: false })}`,
      'Bron: Quick Ticket',
      'Film: ONBEKEND',
      'Bioscoop: ONBEKEND',
      'Datum: ONBEKEND',
      'Tijd: ONBEKEND',
      'Zaal: ONBEKEND',
      'Schematype: UNKNOWN',
      'Stoeltellingen: ONBEKEND',
      'Categorie onbekend onder beschikbare stoelen: ONBEKEND',
      'Ultra Lux herkend: ONBEKEND',
      'Categorie-evidence: UNKNOWN; diagnose: UNKNOWN',
      'GEEN BETROUWBAAR PAAR',
      'Momentopname; wijzigingen vereisen opnieuw lezen. Geen ticket geboekt/gegarandeerd.',
      'Movie Pass-bijbetaling niet gecontroleerd; bijbetaling per account controleren.',
    ].join('\n'),
  );
  const report = formatReadReport(read(dynamicRankPage));
  expect(report).toContain('Schematype: RANK_3');
  expect(report).toContain('Categorie onbekend onder beschikbare stoelen: 2');
  expect(report).not.toMatch(/https:|data:|FAKE_|fake-seat|\b5\s*euro|@|src=/);
  expect(report.length).toBeLessThan(3000);
});

test('protected, malformed, line-injected, URL, account or token-bearing reports refuse copying', () => {
  const result = read(dynamicRankPage);
  expect(() =>
    formatReadReport({ ...result, reason: 'PROTECTED_PAGE' }),
  ).toThrow();
  expect(() =>
    formatReadReport({ ...result, private: 'do not copy' }),
  ).toThrow();
  for (const value of [
    'a@example.test',
    'example.test/path',
    'example.co.uk/path',
    '/kopen/private',
    'abc\u2028private',
    'www.example.test',
    'abc\nprivate',
    'abc\u202Eprivate',
    'token=short',
    'data:image/png;base64,private',
    'javascript:private',
    'Movie Pass 12345',
    'abcdefghijklmnopqrstuvwxyz1234',
  ]) {
    expect(() =>
      formatReadReport({
        ...result,
        fields: {
          ...result.fields,
          movie: { status: 'OBSERVED_VISIBLE', value },
        },
      }),
    ).toThrow();
  }
  // Formatting alone has no clipboard/network/storage side effect.
  const write = vi.fn();
  vi.stubGlobal('navigator', { clipboard: { writeText: write } });
  formatReadReport(result);
  expect(write).not.toHaveBeenCalled();
  vi.unstubAllGlobals();
});
