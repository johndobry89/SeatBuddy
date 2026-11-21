// @vitest-environment jsdom
import { afterEach, expect, test, vi } from 'vitest';
import { createApp, nextTick } from 'vue';
import PopupApp from '../../src/experiment/PopupApp.vue';
import { parseDuoPlan } from '../../src/experiment/duo-plan';
import type { PageRead } from '../../src/experiment/vue-page-reader';

const mockSession = vi.hoisted(() => ({
  read: vi.fn(),
  dispose: vi.fn(),
}));
vi.mock('../../src/experiment/vue-page-reader', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('../../src/experiment/vue-page-reader')
  >()),
  createPageReadSession: () => mockSession,
}));

const observedAt = Date.now();
const observed = (value: string) =>
  ({ status: 'OBSERVED_VISIBLE', value }) as const;
const sample: PageRead = {
  observedAt,
  reason: 'VISIBLE_METADATA',
  screenScope: 'VISIBLE_BOOKING_HERO',
  fields: {
    movie: observed('Clayface'),
    cinema: observed('Vue Enschede'),
    date: observed('2026-11-22'),
    time: observed('19:00'),
    hall: observed('Zaal 5'),
  },
  seats: {
    source: 'VISIBLE_LIVE_SEATMAP',
    observedAt,
    reason: 'CHECK_VISUALLY',
    scheme: 'LUX_4',
    diagnostic: 'NONE',
    categoryEvidence: 'EXACT_VISIBLE_ICON',
    counts: {
      available: 10,
      unavailable: 3,
      picked: 0,
      unknown: 0,
      categoryUnknownAvailable: 0,
      ultraLuxAvailable: 0,
    },
    pairs: [
      {
        row: 7,
        seats: [3, 4],
        categories: ['Super Saver Lux', 'Super Saver Lux'],
      },
    ],
  },
};
const mounted: Array<() => void> = [];

function mountPopup() {
  const element = document.createElement('div');
  document.body.append(element);
  const app = createApp(PopupApp);
  app.mount(element);
  mounted.push(() => {
    app.unmount();
    element.remove();
  });
  return element;
}

function button(root: HTMLElement, text: string) {
  const found = [...root.querySelectorAll('button')].find((candidate) =>
    candidate.textContent?.includes(text),
  );
  if (!found) throw new Error(`Missing button: ${text}`);
  return found;
}

async function flush() {
  await Promise.resolve();
  await nextTick();
  await Promise.resolve();
  await nextTick();
}

afterEach(() => {
  for (const unmount of mounted.splice(0)) unmount();
  mockSession.read.mockReset();
  mockSession.dispose.mockReset();
  vi.unstubAllGlobals();
});

test('A sees a disabled share step until an explicit choice; B can paste and recheck the exact pair', async () => {
  mockSession.read.mockImplementation(async (plan) => ({
    ...sample,
    ...(plan ? { duo: 'DUO_MATCH_POSSIBLE' } : {}),
  }));
  let shared = '';
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: {
      writeText: vi.fn(async (text: string) => {
        shared = text;
      }),
    },
  });

  const a = mountPopup();
  button(a, 'Lees deze Vue-pagina').click();
  await flush();
  expect(a.textContent).toContain('1. Kies jullie stoelen');
  const share = button(a, '2. Kopieer stoelen voor je partner');
  expect(share.disabled).toBe(true);
  expect(a.textContent).toContain('Kies hierboven eerst één paar');
  a.querySelector<HTMLInputElement>('input[name="duo-pair"]')!.click();
  await flush();
  expect(share.disabled).toBe(false);
  share.click();
  await flush();
  expect(parseDuoPlan(shared).pair).toMatchObject({ row: 7, A: 3, B: 4 });
  expect(a.textContent).toContain('stuur het hele bericht nu naar je partner');

  const b = mountPopup();
  const details = [...b.querySelectorAll('details')].find((candidate) =>
    candidate.textContent?.includes('3. Stoelen van partner ontvangen'),
  )!;
  details.open = true;
  details.dispatchEvent(new Event('toggle'));
  await flush();
  expect(details.textContent).toContain('eigen Chrome-profiel');
  const textarea = details.querySelector('textarea')!;
  textarea.value = shared;
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
  await flush();
  button(b, 'Controleer deze stoelen').click();
  await flush();
  expect(
    b.querySelector('[data-testid="duo-status"]')?.getAttribute('data-status'),
  ).toBe('DUO_MATCH_POSSIBLE');
  expect(b.textContent).toContain('Partner: rij 7, stoel 3 · jij: stoel 4');
  expect(mockSession.read).toHaveBeenCalledWith(
    expect.objectContaining({ pair: expect.objectContaining({ A: 3, B: 4 }) }),
  );
});
