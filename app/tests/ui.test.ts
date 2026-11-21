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
  test('must choose explicitly before copying; the copied text is the readable proposal', async () => {
    const { deps } = setup();
    button('Zoek twee stoelen')!.click();
    await flush();
    expect(button('Kopieer voor het tweede venster')!.disabled).toBe(true);
    expect(button('Kopieer om te versturen')!.disabled).toBe(true);
    expect(text()).toMatch(/Kies eerst één paar/);
    const radios = root.querySelectorAll<HTMLInputElement>('input[type="radio"]');
    expect(radios).toHaveLength(3);
    expect([...radios].every((r) => !r.checked)).toBe(true);
    expect(radios[0]!.closest('label')?.textContent).toBe('Rij 1: stoel 1 + 2 · Lux');
    radios[1]!.dispatchEvent(new Event('change'));
    button('Kopieer om te versturen')!.click();
    await flush();
    const message = vi.mocked(deps.copy).mock.calls[0]![0];
    expect(parseProposal(message)).toMatchObject({ row: 1, sender: 3, receiver: 4, readAt: '12:47', showing });
    expect(text()).toMatch(/Gekopieerd!/);
    expect(text()).toMatch(/jij stoel 3 en je partner stoel 4/);
    expect(root.querySelector('textarea')?.value).toBe(message);
  });

  test('second window on this computer: copy once, then clear steps per window', async () => {
    const { deps } = setup();
    button('Zoek twee stoelen')!.click();
    await flush();
    root.querySelector<HTMLInputElement>('input[type="radio"]')!.dispatchEvent(new Event('change'));
    button('Kopieer voor het tweede venster')!.click();
    await flush();
    expect(parseProposal(vi.mocked(deps.copy).mock.calls[0]![0])).toMatchObject({ sender: 1, receiver: 2 });
    expect(text()).toMatch(/Gekopieerd!/);
    expect(text()).toMatch(/Ga naar het tweede Chrome-venster/);
    expect(text()).toMatch(/Kies in dat venster stoel 2 en hier stoel 1 \(rij 1\)/);
    // No text to hand over manually when the clipboard worked.
    expect(root.querySelector('textarea')).toBeNull();
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
    root.querySelector<HTMLInputElement>('input[type="radio"]')!.dispatchEvent(new Event('change'));
    button('Kopieer voor het tweede venster')!.click();
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

describe('checking the chosen seats (second window or partner)', () => {
  const message = formatProposal({ showing, row: 1, sender: 2, receiver: 3, categories: ['Lux', 'Lux'], readAt: '12:47' });

  async function check(draft: string) {
    button('Gekozen stoelen controleren')!.click();
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
