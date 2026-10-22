import { JSDOM } from 'jsdom';
import { afterEach, describe, expect, it } from 'vitest';
import {
  createFixtureReader,
  type FixtureScope,
} from '../../src/adapters/read-only/fictional-reader';
import {
  compareObservation,
  OBSERVATION_TTL_MS,
  readOnlyObservationSchema,
} from '../../src/adapters/read-only/contract';

const id = 'a'.repeat(32);
const scope: FixtureScope = {
  kind: 'PACKAGED',
  extensionId: id,
  world: 'ISOLATED',
  permitted: true,
};
const expected = {
  movie: 'De maan van papier',
  cinema: 'Fictief Filmhuis',
  date: '2030-04-12',
  time: '19:30',
  hall: 'Zaal 2',
};
const html = `<section data-sb-readonly="1" data-representation="semantic">${Object.entries(
  expected,
)
  .map(([key, value]) => `<p data-field="${key}">${value}</p>`)
  .join(
    '',
  )}<span data-seat-label>F10</span><span data-seat-label>F11</span></section>`;
const resources: (() => void)[] = [];
function fixture(
  markup = html,
  url = `chrome-extension://${id}/fixture.html`,
  context = scope,
) {
  const dom = new JSDOM(markup, { url, pretendToBeVisual: true });
  const document = dom.window.document;
  // Explicit DOM-only visibility double: native tests exercise actual layout in an isolated world.
  const reader = createFixtureReader(
    document,
    context,
    (element) => !element.closest('[hidden], [aria-hidden="true"]'),
  );
  resources.push(() => {
    reader.dispose();
    dom.window.close();
  });
  return { document, reader, dom };
}
afterEach(() => resources.splice(0).forEach((dispose) => dispose()));
describe('fiction-only read-only port', () => {
  it('reads only visible allowlisted data without changing DOM, events or request APIs', () => {
    const { document, reader, dom } = fixture(
      html +
        '<input type="password" value="fictional-secret"><p>CONFIRMED fictional@invalid.test</p>',
    );
    const before = document.documentElement.outerHTML;
    dom.window.addEventListener('click', () => {
      throw new Error('No click');
    });
    const observation = reader.read(100_000);
    expect(compareObservation(observation, expected, 100_001)).toEqual({
      status: 'READABLE_FICTION',
      reason: 'READABLE_FICTION',
      fallback: 'MANUAL_ONLY',
    });
    expect(observation.status).toBe('UNKNOWN');
    expect(observation.seatDisplay).toEqual({
      labels: ['F10', 'F11'],
      geometry: 'UNKNOWN',
      availability: 'UNKNOWN',
      relationship: 'LABELS_ONLY_UNVERIFIED',
    });
    expect(document.documentElement.outerHTML).toBe(before);
    expect(JSON.stringify(observation)).not.toMatch(
      /secret|CONFIRMED|@|input|documentId|https/,
    );
  });
  it.each([
    [
      'version',
      html.replace('data-sb-readonly="1"', 'data-sb-readonly="2"'),
      'DOM_CHANGED',
    ],
    ['canvas', html.replace('semantic', 'canvas') + '<canvas/>', 'CANVAS'],
    [
      'hall ambiguity',
      html.replace('</section>', '<p data-field="hall">Zaal 3</p></section>'),
      'AMBIGUOUS',
    ],
    ['duplicate labels', html.replace('F11', 'F10'), 'AMBIGUOUS'],
    ['duplicate roots', html + html, 'AMBIGUOUS'],
    [
      'hidden field',
      html.replace('data-field="movie"', 'hidden data-field="movie"'),
      'HIDDEN',
    ],
    [
      'server',
      html.replace('data-sb-readonly', 'data-server-error data-sb-readonly'),
      'SERVER_UNAVAILABLE',
    ],
    [
      'invalid calendar',
      html.replace('2030-04-12', '2030-02-30'),
      'INVALID_DATA',
    ],
    ['invalid clock', html.replace('19:30', '25:00'), 'INVALID_DATA'],
    [
      'secret in label',
      html.replace('De maan van papier', 'fictional@invalid.test'),
      'INVALID_DATA',
    ],
  ])('fails closed for %s', (_name, markup, code) => {
    const result = fixture(markup).reader.read(100_000);
    expect(result).toMatchObject({
      status: 'UNKNOWN',
      screening: null,
      seatDisplay: null,
      compatibility: code,
    });
  });
  it('uses explicit null for missing fields and refuses mismatch', () => {
    const partial = fixture(
      html.replace('<p data-field="hall">Zaal 2</p>', ''),
    ).reader.read(100_000);
    expect(partial.screening?.hall).toBeNull();
    expect(compareObservation(partial, expected, 100_000).status).toBe(
      'UNKNOWN',
    );
    const mismatch = fixture(
      html.replace('2030-04-12', '2030-04-13').replace('19:30', '21:00'),
    ).reader.read(100_000);
    expect(compareObservation(mismatch, expected, 100_000).reason).toBe(
      'SCREENING_MISMATCH',
    );
  });
  it.each([
    'https://www.vuecinemas.nl/fixture.html',
    `chrome-extension://${id}/fixture.html?token=fake`,
    `chrome-extension://${id}/sidepanel.html`,
    `chrome-extension://${'b'.repeat(32)}/fixture.html`,
    'http://localhost:4173/fixture.html',
  ])('never reads wrong document scope %s', (url) => {
    const { document, reader } = fixture(html, url);
    document.querySelectorAll = () => {
      throw new Error('Must gate before DOM inspection');
    };
    expect(reader.read(100_000).compatibility).toBe('WRONG_SCOPE');
  });
  it('refuses missing permission before DOM access', () => {
    const { document, reader } = fixture(html, undefined, {
      ...scope,
      permitted: false,
    });
    document.querySelectorAll = () => {
      throw new Error('No permission');
    };
    expect(reader.read(100_000).compatibility).toBe('PERMISSION_UNKNOWN');
  });
  it('invalidates immediately on mutations, TTL, navigation, pagehide and dispose without refreshing old observations', () => {
    const { document, reader, dom } = fixture();
    reader.read(100_000);
    document.querySelector('[data-seat-label]')!.textContent = 'F12';
    expect(reader.current(100_001).compatibility).toBe('DOM_CHANGED');
    expect(reader.read(100_002).seatDisplay?.labels).toEqual(['F12', 'F11']);
    expect(reader.current(100_002 + OBSERVATION_TTL_MS).compatibility).toBe(
      'STALE',
    );
    reader.read(200_000);
    expect(reader.current(199_999).compatibility).toBe('STALE');
    reader.read(200_000);
    dom.reconfigure({
      url: `chrome-extension://${id}/fixture.html#navigation`,
    });
    expect(reader.current(200_001).compatibility).toBe('DOCUMENT_CHANGED');
    dom.window.dispatchEvent(new dom.window.Event('pagehide'));
    expect(reader.read(200_002).compatibility).toBe('DISPOSED');
  });
  it('rechecks visibility when CSS/lifecycle changes without DOM mutation', () => {
    let visible = true;
    const { document } = fixture();
    const reader = createFixtureReader(document, scope, () => visible);
    resources.push(() => reader.dispose());
    reader.read(100_000);
    visible = false;
    expect(reader.current(100_001).compatibility).toBe('HIDDEN');
    visible = true;
    expect(reader.current(100_002).compatibility).toBe('STALE');
  });
  it('rejects extra fields, URL/account payloads and alleged confirmation in the strict port schema', () => {
    const observation = fixture().reader.read(100_000);
    for (const extra of [
      { status: 'CONFIRMED' },
      { account: 'fictional' },
      { url: 'https://example.invalid/?token=fake' },
      { provenance: { ...observation.provenance, source: 'LIVE' } },
    ])
      expect(
        readOnlyObservationSchema.safeParse({ ...observation, ...extra })
          .success,
      ).toBe(false);
  });
});

it('does not extract hidden descendant text', () => {
  const nested = fixture(
    html.replace(
      'De maan van papier',
      '<span hidden>fictional-secret</span>De maan van papier',
    ),
  );
  expect(nested.reader.read(100_000)).toMatchObject({
    compatibility: 'INVALID_DATA',
    screening: null,
  });
});
it('does not throw on an unreadable DOM', () => {
  const broken = fixture();
  broken.document.querySelectorAll = () => {
    throw new Error('Private fictional error');
  };
  expect(broken.reader.read(100_000)).toMatchObject({
    compatibility: 'INVALID_DATA',
    screening: null,
  });
});

it('refuses detached documents without a browser view', () => {
  const { document } = fixture();
  const detached = document.implementation.createHTMLDocument('Invented');
  const reader = createFixtureReader(detached, scope);
  expect(reader.read(100_000)).toMatchObject({
    compatibility: 'WRONG_SCOPE',
    screening: null,
  });
  reader.dispose();
});

it('refuses a readable claim without complete data and duplicate labels at the wire boundary', () => {
  const observation = fixture().reader.read(100_000);
  expect(
    readOnlyObservationSchema.safeParse({ ...observation, screening: null })
      .success,
  ).toBe(false);
  expect(
    readOnlyObservationSchema.safeParse({
      ...observation,
      seatDisplay: { ...observation.seatDisplay, labels: ['F10', 'F10'] },
    }).success,
  ).toBe(false);
});
