import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { chromium, type Browser, type BrowserContext } from 'playwright';
import { mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { validateObservation } from '../../src/popup/validate';
import { discover } from '../../src/core/seats';
import { formatProposal } from '../../src/core/message';
import type { Observation } from '../../src/core/types';

/**
 * Real layout, real checkVisibility, real bundled reader.js — on an INVENTED
 * page that is fulfilled locally. Every other request is aborted and counted:
 * this never talks to vuecinemas.nl. It does not prove Vue's real markup.
 */
const dist = resolve(import.meta.dirname, '../../dist');
const shots = resolve(import.meta.dirname, '../../test-results');
const URL = 'https://www.vuecinemas.nl/films/seatbuddies-invented-fixture/kopen';
const icon = (k: string) =>
  `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><title>${k}</title><rect width="16" height="16" fill="#${k === 'ultra' ? '000' : k === 'lux' ? 'a00' : k === 'saver' ? '0a0' : '00a'}"/></svg>`)}`;

function fixture(options: { fade?: boolean } = {}) {
  const seat = (row: number, n: number, col: number, extra = '', state = 'available', cat = 'lux') =>
    `<button class="seats__seat" aria-label="Seat ${row}-${n}, ${state}" data-column="${col}" data-test="s-${row}-${n}" ${state === 'unavailable' ? 'disabled' : ''} style="${extra}"><img data-test="seat-icon-image" src="${icon(cat)}" alt=""></button>`;
  const row = (n: number, cells: string) => `<div class="seats__row" data-test="seats-row-${n}">${cells}</div>`;
  const rows = [
    // Row 1 (front): 1-2-3 then an aisle drawn ONLY with CSS margin, then 4-5.
    row(1, seat(1, 1, 1) + seat(1, 2, 2) + seat(1, 3, 3) + seat(1, 4, 4, 'margin-left:30px') + seat(1, 5, 5)),
    // Row 5 (rear): 8 seats, 1 taken, an unknown icon at seat 8.
    row(5, [1, 2, 3, 4, 5, 6, 7, 8].map((n) => seat(5, n, n, options.fade && n === 4 ? 'opacity:0' : '', n === 1 ? 'unavailable' : 'available', n === 8 ? 'unknown' : 'lux')).join('')),
  ];
  return `<!doctype html><html lang="nl"><head><style>
    body{font:14px sans-serif;margin:20px}
    .seats{display:flex;flex-direction:column;gap:12px;width:max-content}
    .seats__row{display:flex;gap:4px}
    .seats__seat{width:24px;height:24px;padding:0;border:0;background:#eee}
    .seats__seat img{width:16px;height:16px}
    h2[data-test=screen-title]{width:260px;height:20px;margin:0 0 16px;font-size:12px;text-align:center;background:#ccc}
  </style></head><body>
  <section data-test="booking-hero"><h1 data-test="booking-film-title">Demo Film</h1><p class="booking-hero__cinema">Vue Teststad</p>
  <span data-test="booking-hero-cinema-screen-name">Zaal 6</span>
  <time data-test="booking-date-date" datetime="2030-11-22T18:40:00">vr 22 nov</time>
  <time data-test="booking-date-start-time" datetime="18:40">18:40</time></section>
  <div>${['Ultra Lux:ultra', 'Lux:lux', 'Saver Lux:saver', 'Super Saver Lux:super']
    .map((e) => e.split(':'))
    .map(([name, k]) => `<button class="seats-category" data-test="area-category-item-button"><img src="${icon(k!)}" alt=""><span class="seats-category__title">${name} stoelen</span></button>`)
    .join('')}</div>
  <h2 data-test="screen-title">Zaal 6</h2>
  <div class="seats" data-test="seats">${rows.join('')}</div></body></html>`;
}

let browser: Browser;
let context: BrowserContext;
const blocked: string[] = [];

beforeAll(async () => {
  await mkdir(shots, { recursive: true });
  browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  context = await browser.newContext({ deviceScaleFactor: 2 });
  let html = fixture();
  await context.route('**/*', async (route) => {
    const url = route.request().url();
    if (url === URL) return route.fulfill({ contentType: 'text/html', body: html });
    if (url.startsWith('file://')) return route.continue();
    blocked.push(url);
    return route.abort();
  });
  (context as unknown as { setFixture: (h: string) => void }).setFixture = (h) => (html = h);
});
afterAll(async () => {
  await browser?.close();
});

async function observeFixture(html: string): Promise<Observation> {
  (context as unknown as { setFixture: (h: string) => void }).setFixture(html);
  const page = await context.newPage();
  await page.goto(URL);
  await page.addScriptTag({ content: await readFile(resolve(dist, 'reader.js'), 'utf8') });
  const raw = await page.evaluate(() => (globalThis as { __seatbuddiesObserve?: () => unknown }).__seatbuddiesObserve?.());
  await page.close();
  return validateObservation(raw);
}

describe('bundled reader in real Chromium', () => {
  test('real geometry: CSS-only aisle and unknown neighbour are respected, rear row first', async () => {
    const observation = await observeFixture(fixture());
    expect(observation.status).toBe('OK');
    const discovery = discover(observation.map!);
    expect(discovery.mode).toBe('SCREEN');
    const labels = discovery.pairs.map((p) => `${p.row}:${p.seats.join('+')}`);
    // Rear row 5 first, centred; 7+8 excluded (unknown seat 8); 6+7 excluded (buffer).
    expect(labels[0]).toBe('5:4+5');
    expect(labels).not.toContain('5:7+8');
    expect(labels).not.toContain('5:6+7');
    // Row 1: 3+4 are numbered consecutively but split by a CSS aisle.
    expect(labels).not.toContain('1:3+4');
    expect(blocked).toEqual([]);
  });

  test('a fading seat makes the map NOT_VISIBLE (real checkVisibility)', async () => {
    const observation = await observeFixture(fixture({ fade: true }));
    expect(observation.map?.status).toBe('NOT_VISIBLE');
  });
});

describe('built popup at 360 px', () => {
  test('A and B flows fit within 600 px and show the right text', async () => {
    const observation = await observeFixture(fixture());
    const page = await context.newPage();
    await page.setViewportSize({ width: 360, height: 600 });
    await page.addInitScript((obs) => {
      const tab = { id: 1, url: 'https://www.vuecinemas.nl/films/x/kopen', status: 'complete', incognito: false };
      const fresh = () => ({ ...obs, observedAt: Date.now() });
      (globalThis as Record<string, unknown>).chrome = {
        tabs: { query: async () => [tab] },
        scripting: {
          executeScript: async (injection: { files?: string[] }) => [
            { frameId: 0, documentId: 'doc', result: injection.files ? undefined : fresh() },
          ],
        },
      };
      Object.defineProperty(navigator, 'clipboard', { value: { writeText: async (t: string) => ((globalThis as Record<string, unknown>).copied = t) } });
    }, observation);
    await page.goto(`file://${resolve(dist, 'popup.html')}`);
    const height = () => page.evaluate(() => document.documentElement.scrollHeight);
    const noHorizontal = () => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);

    expect(await height()).toBeLessThanOrEqual(600);
    await page.screenshot({ path: resolve(shots, 'popup-home.png') });

    await page.getByRole('button', { name: 'Zoek twee stoelen' }).click();
    await page.getByRole('radio').first().waitFor();
    await page.keyboard.press('Tab');
    expect(await page.getByRole('button', { name: 'Kopieer voor het tweede venster' }).isDisabled()).toBe(true);
    await page.getByRole('radio').first().check();
    expect(await height()).toBeLessThanOrEqual(600);
    expect(await noHorizontal()).toBe(true);
    await page.screenshot({ path: resolve(shots, 'popup-a-choose.png') });
    await page.getByRole('button', { name: 'Kopieer voor het tweede venster' }).click();
    await page.getByText('Gekopieerd!').waitFor();
    const copied = (await page.evaluate(() => (globalThis as Record<string, unknown>).copied)) as string;
    expect(copied).toMatch(/^SeatBuddies-voorstel: Demo Film \| Vue Teststad \| 22-11-2030 18:40 \| Zaal 6 \| rij 5 \| stoel 4 \(verzender\) \+ 5 \(ontvanger\)/);
    expect(await height()).toBeLessThanOrEqual(600);
    await page.screenshot({ path: resolve(shots, 'popup-a-shared.png') });

    await page.getByRole('button', { name: 'Klaar' }).click();
    await page.getByRole('button', { name: 'Gekozen stoelen controleren' }).click();
    // A long, realistic title must still fit.
    const long = formatProposal({
      showing: { movie: 'Demo Film', cinema: 'Vue Teststad', date: '2030-11-22', time: '18:40', hall: 'Zaal 6' },
      row: 5, sender: 4, receiver: 5, categories: ['Lux', 'Lux'], readAt: '12:47',
    });
    // A real paste (keyboard shortcut) starts the check by itself.
    const field = page.getByLabel('Plak het SeatBuddies-voorstel');
    await field.focus();
    await page.evaluate((text) => {
      const area = document.querySelector('#incoming') as HTMLTextAreaElement;
      const data = new DataTransfer();
      data.setData('text/plain', text);
      area.value = text;
      area.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true }));
      area.dispatchEvent(new Event('input', { bubbles: true }));
    }, `[12:50] Sam: ${long}\r\n`);
    await page.getByText('Stoel 5 is nu vrij').waitFor();
    expect(await height()).toBeLessThanOrEqual(600);
    expect(await noHorizontal()).toBe(true);
    await page.screenshot({ path: resolve(shots, 'popup-b-free.png') });
    await page.close();
    expect(blocked).toEqual([]);
  });
});
