// @vitest-environment jsdom
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { formatProposal, parseProposal } from '../src/core/message';
import { ReadError } from '../src/popup/browser';
import { mount, type Deps } from '../src/popup/ui';
import type { Observation } from '../src/core/types';
import { makeMap, makeRow } from './helpers';

const showing = { movie: 'Ebenezer', cinema: 'Vue Enschede', date: '2026-11-22', time: '18:40', hall: 'Zaal 6' };
const obs = (rows = [makeRow(1, 6)], extra: Partial<Observation> = {}): Observation => ({
  status: 'OK',
  observedAt: new Date(2026, 10, 21, 12, 47).getTime(),
  showing,
  map: makeMap(rows),
  ...extra,
});

let root: HTMLElement;
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
const button = (name: string) =>
  [...root.querySelectorAll('button')].find((b) => b.textContent?.trim() === name) as HTMLButtonElement | undefined;
const text = () => root.textContent ?? '';

function setup(overrides: Partial<Deps> = {}) {
  const deps: Deps = {
    read: vi.fn(async () => obs()),
    copy: vi.fn(async () => undefined),
    now: () => new Date(2026, 10, 21, 12, 50).getTime(),
    ...overrides,
  };
  const app = mount(root, deps);
  return { deps, app };
}

beforeEach(() => {
  document.body.innerHTML = '<main id="app"></main>';
  root = document.getElementById('app')!;
});

describe('home', () => {
  test('two clear actions and an always-visible no-reservation notice', () => {
    setup();
    expect(button('Zoek twee stoelen')).toBeTruthy();
    expect(button('Gekozen stoelen controleren')).toBeTruthy();
    expect(root.querySelector('footer')?.textContent).toMatch(/reserveert of betaalt niets.*niet verbonden aan Vue/);
    expect(document.activeElement?.tagName).toBe('H1');
  });
});

describe('person A', () => {
  test('one click on a pair chooses and copies the readable proposal; nothing is pre-chosen', async () => {
    const { deps } = setup();
    button('Zoek twee stoelen')!.click();
    await flush();
    const pairs = root.querySelectorAll<HTMLButtonElement>('button.pair');
    expect([...pairs].map((b) => b.textContent)).toEqual(['Rij 1: stoel 1 + 2 · Lux', 'Rij 1: stoel 3 + 4 · Lux', 'Rij 1: stoel 5 + 6 · Lux']);
    expect(deps.copy).not.toHaveBeenCalled();
    pairs[1]!.click();
    await flush();
    const message = vi.mocked(deps.copy).mock.calls[0]![0];
    expect(parseProposal(message)).toMatchObject({ row: 1, sender: 3, receiver: 4, readAt: '12:47', showing });
    expect(text()).toMatch(/Gekopieerd!/);
    expect(text()).toMatch(/Kies in dat venster stoel 4 en hier stoel 3 \(rij 1\)/);
    // No text to hand over manually when the clipboard worked.
    expect(root.querySelector('textarea')).toBeNull();
    // Switching to "send" shows the text for a chat app.
    button('Ik stuur het voorstel door (bijv. WhatsApp)')!.click();
    expect(text()).toMatch(/jij stoel 3 en je partner stoel 4/);
    expect(root.querySelector('textarea')?.value).toBe(message);
  });

  test('pair buttons are reachable and usable by keyboard', async () => {
    setup();
    button('Zoek twee stoelen')!.click();
    await flush();
    const first = root.querySelector<HTMLButtonElement>('button.pair')!;
    expect(first.tagName).toBe('BUTTON');
    expect(first.closest('[role="group"]')?.getAttribute('aria-label')).toMatch(/klik om te kiezen en te kopiëren/);
  });

  test('says how the list is ordered', async () => {
    setup();
    button('Zoek twee stoelen')!.click();
    await flush();
    expect(text()).toMatch(/Volgorde zoals op de kaart/);
  });

  test('clipboard refusal is not reported as copied; the text stays available', async () => {
    setup({ copy: vi.fn(async () => Promise.reject(new Error('denied'))) });
    button('Zoek twee stoelen')!.click();
    await flush();
    root.querySelector<HTMLButtonElement>('button.pair')!.click();
    await flush();
    expect(text()).not.toMatch(/Gekopieerd!/);
    expect(text()).toMatch(/Automatisch kopiëren lukte niet/);
    expect(root.querySelector('textarea')?.value).toMatch(/^SeatBuddies-voorstel:/);
  });

  test('explains why there is no proposal', async () => {
    const read = vi
      .fn<Deps['read']>()
      .mockResolvedValueOnce(obs(undefined, { status: 'PROTECTED', map: null, showing: {} }))
      .mockResolvedValueOnce(obs([makeRow(1, 3, { 3: { state: 'unavailable' } })]))
      .mockRejectedValueOnce(new ReadError('NOT_VUE_TAB'))
      .mockResolvedValueOnce(obs(undefined, { map: { ...makeMap([]), status: 'NOT_VISIBLE' } }));
    setup({ read });
    button('Zoek twee stoelen')!.click();
    await flush();
    expect(text()).toMatch(/inlog-, account- of betaalpagina/);
    button('Opnieuw lezen')!.click();
    await flush();
    expect(text()).toMatch(/1 mogelijk paar is overgeslagen/);
    button('Opnieuw lezen')!.click();
    await flush();
    expect(text()).toMatch(/Open eerst de stoelkaart op vuecinemas\.nl/);
    button('Opnieuw lezen')!.click();
    await flush();
    expect(text()).toMatch(/nog niet helemaal geladen/);
  });
});

describe('second account in incognito', () => {
  test('opens an incognito window on request and explains the one-time Chrome setting', async () => {
    const openIncognito = vi.fn(async () => undefined);
    setup({ openIncognito });
    button('Open tweede account (incognito)')!.click();
    await flush();
    expect(openIncognito).toHaveBeenCalledTimes(1);
    expect(text()).toMatch(/Log daar in op het tweede account/);
    expect(text()).toMatch(/Toestaan in incognito/);
  });

  test('a refused incognito window gives an alternative, not a false success', async () => {
    setup({ openIncognito: vi.fn(async () => Promise.reject(new Error('disabled by policy'))) });
    button('Open tweede account (incognito)')!.click();
    await flush();
    expect(text()).toMatch(/Openen lukte niet; incognito staat mogelijk uit/);
    expect(text()).not.toMatch(/geopend/);
  });
});

describe('automatic start when the popup opens', () => {
  const message = formatProposal({ showing, row: 1, sender: 2, receiver: 3, categories: ['Lux', 'Lux'], readAt: '12:47' });

  test('normal window: searches at once, without touching the clipboard', async () => {
    const readClipboard = vi.fn(async () => message);
    const deps: Deps = { read: vi.fn(async () => obs()), copy: vi.fn(async () => undefined), now: () => 0, readClipboard, isIncognito: async () => false };
    mount(root, deps, { autoStart: true });
    await flush();
    await flush();
    expect(root.querySelectorAll('button.pair')).toHaveLength(3);
    expect(readClipboard).not.toHaveBeenCalled();
  });

  test('incognito window: checks a SeatBuddies proposal from the clipboard at once', async () => {
    const deps: Deps = { read: vi.fn(async () => obs()), copy: vi.fn(async () => undefined), now: () => 0, readClipboard: async () => `Sam: ${message}`, isIncognito: async () => true };
    mount(root, deps, { autoStart: true });
    await flush();
    await flush();
    expect(root.querySelector('.result h2')?.textContent).toBe('Stoel 3 is nu vrij');
  });

  test('incognito window: other clipboard content is ignored and never shown', async () => {
    const read = vi.fn(async () => obs());
    const deps: Deps = { read, copy: vi.fn(async () => undefined), now: () => 0, readClipboard: async () => 'mijn-geheime-wachtwoord', isIncognito: async () => true };
    mount(root, deps, { autoStart: true });
    await flush();
    await flush();
    expect(read).not.toHaveBeenCalled();
    expect(root.querySelector<HTMLTextAreaElement>('#incoming')?.value).toBe('');
    expect(text()).not.toMatch(/wachtwoord/);
  });

  test('a refused clipboard read falls back to the paste field', async () => {
    const deps: Deps = { read: vi.fn(async () => obs()), copy: vi.fn(async () => undefined), now: () => 0, readClipboard: async () => Promise.reject(new Error('denied')), isIncognito: async () => true };
    mount(root, deps, { autoStart: true });
    await flush();
    await flush();
    expect(document.activeElement?.id).toBe('incoming');
  });
});

describe('checking the chosen seats (second window or partner)', () => {
  const message = formatProposal({ showing, row: 1, sender: 2, receiver: 3, categories: ['Lux', 'Lux'], readAt: '12:47' });

  async function check(draft: string) {
    button('Gekozen stoelen controleren')!.click();
    await flush();
    const area = root.querySelector<HTMLTextAreaElement>('#incoming')!;
    expect(document.activeElement).toBe(area);
    area.value = draft;
    area.dispatchEvent(new Event('input'));
    button('Controleer op deze pagina')!.click();
    await flush();
  }

  test('free: says which seat belongs to this window and that nothing is held', async () => {
    setup();
    await check(`Sam: ${message}\n`);
    const result = root.querySelector('.result')!;
    expect(result.classList.contains('go')).toBe(true);
    expect(result.textContent).toMatch(/Stoel 3 is nu vrij/);
    expect(result.textContent).toMatch(/Kies hier stoel 3 en rond de boeking af; stoel 2 hoort bij het andere account/);
    expect(result.textContent).toMatch(/geen reservering/);
  });

  test('pasting checks right away, without a second click', async () => {
    const { deps } = setup();
    button('Gekozen stoelen controleren')!.click();
    await flush();
    const area = root.querySelector<HTMLTextAreaElement>('#incoming')!;
    area.value = message;
    area.dispatchEvent(new Event('paste'));
    area.dispatchEvent(new Event('input'));
    await flush();
    await flush();
    expect(deps.read).toHaveBeenCalledTimes(1);
    expect(root.querySelector('.result h2')?.textContent).toBe('Stoel 3 is nu vrij');
  });

  test('after the first seat is booked in the other window, this window gets a clear go-ahead', async () => {
    setup({ read: vi.fn(async () => obs([makeRow(1, 6, { 2: { state: 'unavailable' } })])) });
    await check(message);
    const result = root.querySelector('.result')!;
    expect(result.classList.contains('warn')).toBe(true);
    expect(result.textContent).toMatch(/Stoel 3 is vrij, stoel 2 niet meer/);
    expect(result.textContent).toMatch(/kies hier stoel 3/);
  });

  test('invalid text never reads the page', async () => {
    const { deps } = setup();
    await check('hallo, rij 1 stoel 2 en 3?');
    expect(deps.read).not.toHaveBeenCalled();
    expect(root.querySelector('[role="alert"]')?.textContent).toMatch(/Geen SeatBuddies-voorstel gevonden/);
  });

  test('other showing lists both values', async () => {
    setup({ read: vi.fn(async () => obs(undefined, { showing: { ...showing, time: '21:00' } })) });
    await check(message);
    expect(text()).toMatch(/STOP: andere voorstelling/);
    expect(text()).toMatch(/tijd \(hier: 21:00, voorstel: 18:40\)/);
  });

  test('editing the pasted text removes the earlier verdict at once', async () => {
    setup();
    await check(message);
    expect(root.querySelector('.result')).not.toBeNull();
    const area = root.querySelector<HTMLTextAreaElement>('#incoming')!;
    area.value = message.replace('stoel 2', 'stoel 4');
    area.dispatchEvent(new Event('input'));
    expect(root.querySelector('.result')).toBeNull();
    expect(document.activeElement?.id).toBe('incoming');
  });

  test('a late browser answer after leaving the screen is ignored', async () => {
    let release!: (o: Observation) => void;
    setup({ read: vi.fn(() => new Promise<Observation>((resolve) => (release = resolve))) });
    button('Gekozen stoelen controleren')!.click();
    await flush();
    const area = root.querySelector<HTMLTextAreaElement>('#incoming')!;
    area.value = message;
    button('Controleer op deze pagina')!.click();
    await flush();
    button('← Terug')!.click();
    release(obs());
    await flush();
    expect(root.querySelector('.result')).toBeNull();
    expect(button('Zoek twee stoelen')).toBeTruthy();
  });

  test('old proposals get an age hint; the verdict itself is always fresh', async () => {
    setup({ now: () => new Date(2026, 10, 21, 13, 30).getTime() });
    await check(message);
    expect(text()).toMatch(/Het voorstel is 43 minuten oud/);
  });
});
