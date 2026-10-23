import { afterEach, expect, test, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import {
  createPageReadSession,
  readVisibleVuePage,
  type PageRead,
} from '../../src/experiment/vue-page-reader';
import { publicShowing } from '../fixtures/vue-page-reader';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
function extract(
  html: string,
  url = 'https://www.vuecinemas.nl/public-fixture',
): PageRead {
  const dom = new JSDOM(html, { url, runScripts: 'outside-only' });
  const { window } = dom;
  // DOM-layout doubles only; actual visibility/serialization is separately tested in Chrome.
  Object.defineProperty(window.HTMLElement.prototype, 'checkVisibility', {
    value() {
      return !this.closest('[hidden], [style="display:none"]');
    },
  });
  Object.defineProperty(window.HTMLElement.prototype, 'getClientRects', {
    value() {
      return [{}];
    },
  });
  Object.defineProperty(window.HTMLElement.prototype, 'innerText', {
    get() {
      return this.textContent;
    },
  });
  Object.defineProperty(window.HTMLInputElement.prototype, 'value', {
    get() {
      throw new Error('Input must never be read');
    },
  });
  try {
    return window.eval(`(${readVisibleVuePage.toString()})()`) as PageRead;
  } finally {
    window.close();
  }
}

test('one invented public showing returns only the exact visible allowlisted fields', () => {
  const result = extract(
    publicShowing.replace(
      '</body>',
      '<form hidden><input value="fictional-secret"></form><p>outside-secret@example.invalid</p></body>',
    ),
  );
  expect(result.reason).toBe('VISIBLE_METADATA');
  expect(result.screenScope).toBe('VISIBLE_MAIN_METADATA');
  expect(result.observedAt).toBeGreaterThan(0);
  expect(result.fields).toEqual(
    Object.fromEntries(
      Object.entries({
        movie: 'De maan van papier',
        cinema: 'Fictief Filmhuis',
        date: '2030-04-12',
        time: '19:30',
        hall: 'Zaal 2',
      }).map(([key, value]) => [key, { status: 'OBSERVED_VISIBLE', value }]),
    ),
  );
  expect(JSON.stringify(result)).not.toMatch(/secret|example|input|value=/);
});

test('listing never picks a showtime; incomplete listings keep missing fields unknown', () => {
  for (const second of ['21:30', '19:30']) {
    const listing = extract(
      publicShowing.replace('</dl>', `<dt>Tijd</dt><dd>${second}</dd></dl>`),
    );
    expect(listing.fields.time).toEqual({ status: 'AMBIGUOUS', value: null });
  }
  expect(
    extract(publicShowing.replace('19:30', '19:30 of 21:30')).fields.time
      .status,
  ).toBe('AMBIGUOUS');
  expect(
    extract(
      publicShowing.replace(
        '</main>',
        '<dl><dt>Zaal</dt><dd>Zaal 3</dd></dl></main>',
      ),
    ).fields.time.status,
  ).toBe('AMBIGUOUS');
  const partial = extract(
    publicShowing.replace(/<dt>Datum<\/dt>.*?<\/dl>/, '</dl>'),
  );
  expect(partial.fields.movie.value).toBe('De maan van papier');
  expect(partial.fields.cinema.value).toBe('Fictief Filmhuis');
  for (const key of ['date', 'time', 'hall'] as const)
    expect(partial.fields[key]).toEqual({ status: 'UNKNOWN', value: null });
});

test('Chrome target/grant guards refuse wrong origins, incognito, navigation, expired access and malformed results', async () => {
  const base = {
    id: 12,
    windowId: 5,
    active: true,
    incognito: false,
    status: 'complete',
    url: 'https://www.vuecinemas.nl/public-fixture',
  };
  for (const patch of [
    { url: 'http://www.vuecinemas.nl/' },
    { url: 'https://www.vuecinemas.nl.evil.invalid/' },
    { url: 'https://www.vuecinemas.nl:444/' },
    { incognito: true },
    { url: undefined },
    { pendingUrl: 'https://www.vuecinemas.nl/other' },
    { status: 'loading' },
    {},
  ]) {
    const executeScript = vi
      .fn()
      .mockRejectedValue(new Error('fictional-private-error'));
    const query = vi.fn().mockResolvedValue([{ ...base, ...patch }]);
    const removeListener = vi.fn();
    const onUpdated = { addListener: vi.fn(), removeListener };
    vi.stubGlobal('window', {});
    vi.stubGlobal('chrome', {
      extension: { getViews: () => [window] },
      tabs: {
        query,
        onUpdated,
        onActivated: { addListener: vi.fn(), removeListener },
      },
      scripting: { executeScript },
    });
    const session = createPageReadSession(vi.fn());
    await expect(session.read()).rejects.toThrow('NIET BESCHIKBAAR');
    expect(executeScript).toHaveBeenCalledTimes(
      Object.keys(patch).length ? 0 : 1,
    );
    session.dispose();
    expect(removeListener).toHaveBeenCalledTimes(2);
  }
  // Also exercise post-injection validation and the one-call lifetime cap.
  const executeScript = vi.fn().mockResolvedValue([
    {
      frameId: 0,
      documentId: 'fixture-document',
      result: {
        ...extract(publicShowing),
        secret: 'fictional-private-value',
      },
    },
  ]);
  const query = vi.fn().mockResolvedValue([base]);
  const addListener = vi.fn(),
    removeListener = vi.fn();
  vi.stubGlobal('chrome', {
    extension: { getViews: () => [window] },
    tabs: {
      query,
      onUpdated: { addListener, removeListener },
      onActivated: { addListener, removeListener },
    },
    scripting: { executeScript },
  });
  const session = createPageReadSession(vi.fn());
  await expect(session.read()).rejects.toThrow('NIET BESCHIKBAAR');
  await expect(session.read()).rejects.toThrow('NIET BESCHIKBAAR');
  expect(executeScript).toHaveBeenCalledOnce();
  expect(executeScript.mock.calls[0]?.[0]).toMatchObject({
    target: { tabId: 12, frameIds: [0] },
    world: 'ISOLATED',
  });
  session.dispose();
  // Navigation while the popup is open revokes the initial target, even on the same URL.
  const navigated = createPageReadSession(vi.fn());
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  const callback = addListener.mock.calls.at(-2)?.[0] as (
    id: number,
    change: { status: string },
  ) => void;
  callback(12, { status: 'loading' });
  await expect(navigated.read()).rejects.toThrow('NIET BESCHIKBAAR');
  expect(executeScript).toHaveBeenCalledOnce();
  navigated.dispose();
});

test('unsupported/malformed DOM and visible login/payment overlays fail closed without private text', () => {
  for (const html of [
    '<main><h1>Welcome fictional-account</h1></main>',
    '<main></main>',
    publicShowing.replace('2030-04-12', '2030-99-99'),
  ]) {
    const result = extract(html);
    expect(result.fields.date).toEqual({ status: 'UNKNOWN', value: null });
    expect(JSON.stringify(result)).not.toContain('fictional-account');
  }
  for (const overlay of [
    '<dialog open>fictional-secret</dialog>',
    '<div role="dialog">fictional-secret</div>',
    '<input type="password" value="fictional-secret">',
    '<input autocomplete="cc-number" value="4111111111111111">',
  ]) {
    const result = extract(
      publicShowing.replace('</body>', `${overlay}</body>`),
    );
    expect(result.reason).toBe('PROTECTED_PAGE');
    expect(
      Object.values(result.fields).every(
        (field) => field.status === 'UNKNOWN' && field.value === null,
      ),
    ).toBe(true);
    expect(JSON.stringify(result)).not.toMatch(/secret|411111/);
  }
  const invalidSibling = extract(
    publicShowing.replace('</dl>', '<dt>Tijd</dt><dd>onleesbaar</dd></dl>'),
  );
  expect(invalidSibling.fields.time.status).toBe('UNKNOWN');
  expect(extract(publicShowing, 'https://evil.invalid/').reason).toBe(
    'UNSUPPORTED',
  );
});
