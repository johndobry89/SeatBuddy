import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import { fictionalObserver } from '../../src/adapters/vue-cinemas/fictional';
const screening = readFileSync(
  new URL('../fixtures/public-showtime.html', import.meta.url),
  'utf8',
);
const svg = readFileSync(
  new URL('../fixtures/seatmap.svg', import.meta.url),
  'utf8',
);
const observe = (html: string) =>
  fictionalObserver.observe(new JSDOM(html).window.document, 100_000);
describe('strictly fictional pure DOM/SVG adapter boundary', () => {
  it('normalizes only the synthetic screening and seat contract', () => {
    expect(observe(screening)).toMatchObject({
      kind: 'FICTIONAL_DOM',
      observation: {
        status: 'UNKNOWN',
        showtime: { movie: 'De maan van papier' },
      },
    });
    expect(observe(svg)).toMatchObject({
      kind: 'FICTIONAL_DOM',
      observation: {
        status: 'SELECTED',
        seat: { section: 'links', label: 'F10' },
      },
    });
  });
  it('cannot infer confirmation from arbitrary page text or account-like data', () => {
    const result = observe(svg + '<h1>CONFIRMED: fictional@invalid.test</h1>');
    expect(JSON.stringify(result)).not.toContain('CONFIRMED');
    expect(JSON.stringify(result)).not.toContain('@');
    expect(observe('<h1>CONFIRMED</h1>').kind).toBe('UNAVAILABLE');
  });
  it('rejects changed/ambiguous markup and incomplete seat geometry', () => {
    expect(observe(screening + screening).kind).toBe('UNAVAILABLE');
    expect(observe(svg.replace('data-position="4"', '')).kind).toBe(
      'UNAVAILABLE',
    );
    expect(
      observe(svg.replace('aria-pressed="false"', 'aria-pressed="true"')).kind,
    ).toBe('UNAVAILABLE');
    expect(
      observe(
        svg.replace(
          'data-seatmates-screening-fixture="v1"',
          'data-site="untrusted"',
        ),
      ).kind,
    ).toBe('UNAVAILABLE');
  });
});
