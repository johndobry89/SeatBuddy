import { describe, expect, test, vi } from 'vitest';
import { readActiveTab, ReadError } from '../src/popup/browser';
import { validateObservation } from '../src/popup/validate';
import { makeMap, makeRow } from './helpers';

const NOW = 5_000_000;
const good = {
  status: 'OK',
  observedAt: NOW - 50,
  showing: { movie: 'Ebenezer', cinema: 'Vue Enschede', date: '2026-11-22', time: '18:40', hall: 'Zaal 6' },
  map: makeMap([makeRow(1, 2)]),
};

function fakeChrome(options: { tab?: Partial<chrome.tabs.Tab>; after?: Partial<chrome.tabs.Tab>; results?: unknown; docs?: [string, string]; fail?: boolean } = {}) {
  const tab = { id: 7, url: 'https://www.vuecinemas.nl/films/x/kopen', status: 'complete', incognito: false, active: true, ...options.tab };
  const query = vi.fn().mockResolvedValueOnce([tab]).mockResolvedValueOnce([{ ...tab, ...options.after }]);
  const [d1, d2] = options.docs ?? ['doc-1', 'doc-1'];
  const executeScript = vi
    .fn()
    .mockImplementationOnce(async () => {
      if (options.fail) throw new Error('Cannot access contents of url "https://private.example/?token=abc"');
      return [{ frameId: 0, documentId: d1, result: undefined }];
    })
    .mockImplementationOnce(async () => [{ frameId: 0, documentId: d2, result: 'results' in options ? options.results : good }]);
  return { api: { tabs: { query }, scripting: { executeScript } } as unknown as Parameters<typeof readActiveTab>[0], executeScript };
}

const reason = async (promise: Promise<unknown>) => {
  try {
    await promise;
    return 'RESOLVED';
  } catch (error) {
    return error instanceof ReadError ? error.reason : 'OTHER';
  }
};

describe('active tab read', () => {
  test('injects the reader file, then reads, both in the top frame of the same document', async () => {
    const { api, executeScript } = fakeChrome();
    const result = await readActiveTab(api, () => NOW);
    expect(result.status).toBe('OK');
    expect(executeScript.mock.calls[0]![0]).toMatchObject({ target: { tabId: 7, frameIds: [0] }, files: ['reader.js'], world: 'ISOLATED' });
    expect(executeScript.mock.calls[1]![0]).toMatchObject({ target: { tabId: 7, frameIds: [0] }, world: 'ISOLATED' });
  });

  test('refuses before injecting: other site, incognito, loading, no grant', async () => {
    for (const [tab, expected] of [
      [{ url: 'https://example.com/' }, 'NOT_VUE_TAB'],
      [{ url: 'https://www.vuecinemas.nl.evil.example/' }, 'NOT_VUE_TAB'],
      [{ url: undefined }, 'NOT_VUE_TAB'],
      [{ incognito: true }, 'INCOGNITO'],
      [{ status: 'loading' }, 'TAB_LOADING'],
      [{ id: undefined }, 'NOT_VUE_TAB'],
    ] as const) {
      const { api, executeScript } = fakeChrome({ tab });
      expect(await reason(readActiveTab(api, () => NOW))).toBe(expected);
      expect(executeScript).not.toHaveBeenCalled();
    }
  });

  test('navigation, tab switch or a different document during the read is TAB_CHANGED', async () => {
    expect(await reason(readActiveTab(fakeChrome({ after: { id: 8 } }).api, () => NOW))).toBe('TAB_CHANGED');
    expect(await reason(readActiveTab(fakeChrome({ after: { url: 'https://www.vuecinemas.nl/other' } }).api, () => NOW))).toBe('TAB_CHANGED');
    expect(await reason(readActiveTab(fakeChrome({ docs: ['doc-1', 'doc-2'] }).api, () => NOW))).toBe('TAB_CHANGED');
  });

  test('raw browser errors are never surfaced (they can contain URLs)', async () => {
    const { api } = fakeChrome({ fail: true });
    const error = await readActiveTab(api, () => NOW).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ReadError);
    expect(String((error as Error).message)).not.toMatch(/token|private/);
  });

  test('malformed or stale page data is INVALID', async () => {
    for (const results of [null, { ...good, extra: 1 }, { ...good, status: 'CONFIRMED' }, { ...good, observedAt: NOW - 60_000 }]) {
      expect(await reason(readActiveTab(fakeChrome({ results }).api, () => NOW))).toBe('INVALID');
    }
  });
});

describe('observation validation', () => {
  test('incorrect JSON payloads are rejected as a whole', () => {
    expect(validateObservation(good, NOW).status).toBe('OK');
    const seat = good.map.rows[0]![0]!;
    const bad: unknown[] = [
      { ...good, showing: { ...good.showing, movie: '<img src=x onerror=alert(1)>' } },
      { ...good, showing: { ...good.showing, account: 'x' } },
      { ...good, map: { ...good.map, rows: [[{ ...seat, row: 0 }]] } },
      { ...good, map: { ...good.map, rows: [[{ ...seat, state: 'booked' }]] } },
      { ...good, map: { ...good.map, rows: [[{ ...seat, category: 'Regular' }]] } }, // not in LUX_4
      { ...good, map: { ...good.map, rows: [[{ ...seat, rect: { left: Infinity, top: 0, width: 1, height: 1 } }]] } },
      { ...good, map: null },
      { ...good, showing: { movie: 'x' } },
      { ...good, observedAt: NOW + 5000 },
      'OK',
    ];
    for (const payload of bad) expect(() => validateObservation(payload, NOW)).toThrow();
  });
});
