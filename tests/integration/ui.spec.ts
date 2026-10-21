import { chromium, expect, test, type Page } from '@playwright/test';
import { Coordinator } from '../../src/background/coordinator';
import { routeMessage } from '../../src/background/message-router';
import { RetainedData } from '../../src/background/retained-data';
import { memoryStorage } from '../helpers/storage';
import { ROSTER_KEY, DRAFT_KEY } from '../../src/core/retained-data';

// A transport double only: the built Vue UI talks to the real router + coordinator in Node.
// This does not validate Chrome extension APIs, incognito or Side Panel placement.
interface MockControl {
  unavailable: boolean;
  worker: Coordinator;
  panelDenied?: boolean;
  launches?: { windowId: number; gesture: boolean }[];
  widgetReads?: number;
  retained?: RetainedData;
}
async function attachMockTransport(
  page: Page,
  coordinator: Coordinator,
  control: MockControl = { unavailable: false, worker: coordinator },
) {
  let reads = 0;
  await page.exposeFunction('mockRuntimeSend', (raw: unknown) => {
    if (
      typeof raw === 'object' &&
      raw &&
      'type' in raw &&
      raw.type === 'GET_BUDDY'
    )
      control.widgetReads = (control.widgetReads ?? 0) + 1;
    if (control.unavailable)
      return {
        ok: false,
        code: 'BROWSER_UNAVAILABLE',
        error: 'Fictieve transportfout',
      };
    if (
      typeof raw === 'object' &&
      raw !== null &&
      'type' in raw &&
      raw.type === 'GET_STATE'
    )
      reads++;
    const sender = {
      id: 'fictional-extension',
      url: `chrome-extension://fictional-extension/${new URL(page.url()).pathname.split('/').pop()}`,
      frameId: 0,
      documentId: 'fictional-doc',
      tab: { id: 7, windowId: 1, incognito: false },
    };
    const route = (message: unknown) =>
      routeMessage(
        control.worker,
        message,
        sender,
        'fictional-extension',
        false,
        Date.now(),
      );
    return control.retained
      ? control.retained.execute(
          raw,
          Date.now(),
          false,
          () => route(raw),
          () =>
            route({
              type: page.url().includes('popup.html')
                ? 'BUDDY_READ'
                : 'GET_STATE',
            }),
          () => false,
        )
      : route(raw);
  });
  await page.exposeFunction(
    'mockPanelOpen',
    (windowId: number, gesture: boolean) => {
      control.launches?.push({ windowId, gesture });
      if (control.panelDenied) throw new Error('Fictional policy denial');
    },
  );
  await page.addInitScript(() => {
    Object.defineProperty(globalThis, 'chrome', {
      value: {
        windows: { getCurrent: async () => ({ id: 17 }) },
        sidePanel: {
          open: ({ windowId }: { windowId: number }) => {
            const bridge = Reflect.get(globalThis, 'mockPanelOpen') as (
              id: number,
              active: boolean,
            ) => Promise<void>;
            return bridge(windowId, navigator.userActivation.isActive);
          },
        },
        runtime: {
          getManifest: () => ({
            manifest_version: 3,
            version: '0.5.0',
            permissions: ['sidePanel', 'storage'],
          }),
          sendMessage: (message: unknown) => {
            const bridge = Reflect.get(globalThis, 'mockRuntimeSend') as (
              raw: unknown,
            ) => Promise<unknown>;
            return bridge(message);
          },
        },
      },
    });
  });
  return () => reads;
}

test('built Vue UI: matching, mismatch, partial outcome, aisle, expiry and manual fallback', async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH ?? chromium.executablePath(),
    args: ['--no-sandbox'],
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 360, height: 900 },
    });
    const coordinator = new Coordinator();
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await attachMockTransport(page, coordinator);
    await page.goto('http://127.0.0.1:4173/sidepanel.html');
    await page
      .getByRole('button', { name: 'Simulatie / technische proef' })
      .click();
    await expect(page.getByTestId('status-A')).toHaveText('UNKNOWN');
    await expect(page.getByTestId('status-B')).toHaveText('UNKNOWN');
    await page.getByRole('button', { name: 'Start simulatie' }).click();
    await expect(page.getByTestId('match')).toHaveText('MATCH');
    await expect(page.getByTestId('adjacency')).toHaveText('MOCK_ADJACENT');
    await expect(page.getByTestId('status-A')).toHaveText('SELECTED');
    await page
      .getByRole('button', { name: 'Volgende simulatiestap A' })
      .click();
    await expect(page.getByTestId('status-A')).toHaveText('REVIEW_REQUIRED');
    await expect(page.getByTestId('status-B')).toHaveText('SELECTED');
    await page.getByLabel('Scenario', { exact: true }).selectOption('partial');
    await page.getByRole('button', { name: 'Start simulatie' }).click();
    await expect(page.getByTestId('status-A')).toHaveText('SIMULATED_COMPLETE');
    await expect(page.getByTestId('status-B')).toHaveText('FAILED');
    await expect(
      page.getByText('Partiële simulatie:', { exact: false }),
    ).toBeVisible();
    await page.screenshot({
      path: 'test-results/panel-partial.png',
      fullPage: true,
    });
    await page.getByLabel('Scenario', { exact: true }).selectOption('mismatch');
    await page.getByRole('button', { name: 'Start simulatie' }).click();
    await expect(page.getByTestId('match')).toHaveText('MISMATCH');
    await page.getByLabel('Scenario', { exact: true }).selectOption('aisle');
    await page.getByRole('button', { name: 'Start simulatie' }).click();
    await expect(page.getByTestId('adjacency')).toHaveText('NOT_ADJACENT');
    await page.getByLabel('Scenario', { exact: true }).selectOption('stale');
    await page.getByRole('button', { name: 'Start simulatie' }).click();
    await expect(page.getByTestId('status-A')).toHaveText('SELECTED');
    await expect(page.getByTestId('status-B')).toHaveText('UNKNOWN');
    // Reset the mock coordinator; this does not exercise Chrome service worker suspension.
    coordinator.reset();
    await expect(page.getByTestId('status-A')).toHaveText('UNKNOWN');
    const checklist = page.getByRole('group', { name: 'Checklist persoon A' });
    await checklist.getByRole('checkbox').first().check();
    await expect(page.getByTestId('status-A')).toHaveText('UNKNOWN');
    await expect(page.getByTestId('status-B')).toHaveText('UNKNOWN');
    await page.setViewportSize({ width: 320, height: 900 });
    const width = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    }));
    expect(width.scroll).toBeLessThanOrEqual(width.client);
    await page.screenshot({
      path: 'test-results/panel-manual.png',
      fullPage: true,
    });
    await page.reload();
    await page
      .getByRole('button', { name: 'Simulatie / technische proef' })
      .click();
    await expect(checklist.getByRole('checkbox').first()).not.toBeChecked();
    expect(errors).toEqual([]);
  } finally {
    await browser.close();
  }
});

test('reconnection, worker generation and explicit privacy-safe diagnostic in a narrow keyboard-driven panel', async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH ?? chromium.executablePath(),
    args: ['--no-sandbox'],
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 320, height: 900 },
    });
    const worker = new Coordinator();
    const control = { unavailable: false, worker };
    await attachMockTransport(page, worker, control);
    await page.goto('http://127.0.0.1:4173/sidepanel.html');
    async function plan() {
      await page.locator('#plan-movie').fill('De maan van papier');
      await page.locator('#plan-cinema').fill('Fictief Filmhuis');
      await page.locator('#plan-date').fill('2030-04-12');
      await page.locator('#plan-time').fill('19:30');
      await page.locator('#plan-hall').fill('Zaal 2');
      await page.getByRole('button', { name: 'Bewaar filmplan' }).click();
    }
    await plan();
    await expect(page.getByTestId('manual-evidence-A')).toContainText(
      'MANUAL_SELF_REPORT',
    );
    await page
      .getByRole('button', {
        name: 'Ik gebruik mijn eigen account en geldige pas — A',
      })
      .click();
    control.worker = new Coordinator();
    await expect(
      page.getByText('Chrome-coördinator opnieuw gestart.', { exact: false }),
    ).toBeVisible();
    await expect(page.locator('#plan-movie')).toHaveValue('');
    await expect(page.getByTestId('manual-evidence-A')).toContainText(
      'UNKNOWN',
    );
    await plan();
    await page
      .getByText('Diagnostiek zonder privégegevens', { exact: true })
      .click();
    await expect(page.getByTestId('diagnostic-report')).toHaveCount(0);
    await page.getByRole('button', { name: 'Voer zelfcontrole uit' }).focus();
    await page.keyboard.press('Enter');
    const report = page.getByTestId('diagnostic-report');
    await expect(report).toContainText('"extensionVersion": "0.5.0"');
    await expect(report).toContainText('NOT_IMPLEMENTED');
    await expect(report).toContainText('SIDE_PANEL_AND_STORAGE');
    await expect(report).not.toContainText('De maan van papier');
    await page
      .getByRole('button', { name: 'Wis diagnostische momentopname' })
      .click();
    await expect(report).toHaveCount(0);
    control.unavailable = true;
    await page.getByRole('button', { name: 'Voer zelfcontrole uit' }).click();
    await expect(page.getByRole('alert')).toContainText(
      'Browserverbinding niet beschikbaar',
    );
    await expect(report).toContainText('LOCAL_ONLY');
    await expect(page.locator('#plan-movie')).toHaveValue('');
    await plan();
    control.unavailable = false;
    const reconnect = page.getByRole('button', {
      name: 'Verbind opnieuw en wis tijdelijke gegevens',
    });
    await reconnect.focus();
    await page.keyboard.press('Enter');
    await expect(
      page.getByText('Browserverbinding hersteld.', { exact: false }),
    ).toBeVisible();
    await expect(page.locator('#plan-movie')).toHaveValue('');
    await expect(page.getByTestId('manual-status-A')).toHaveText(
      'Nog niet gecontroleerd',
    );
    expect(control.worker.manual.plan).toBeNull();
    const width = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    }));
    expect(width.scroll).toBeLessThanOrEqual(width.client);
    await page.screenshot({
      path: 'test-results/sprint03-recovery.png',
      fullPage: true,
    });
  } finally {
    await browser.close();
  }
});

test('missing runtime keeps a usable local manual planner without claiming Chrome access', async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH ?? chromium.executablePath(),
    args: ['--no-sandbox'],
  });
  try {
    const page = await browser.newPage();
    await page.goto('http://127.0.0.1:4173/sidepanel.html');
    await expect(page.getByRole('alert')).toContainText(
      'Browserverbinding niet beschikbaar',
    );
    await expect(page.getByTestId('manual-status-A')).toHaveText(
      'Nog niet gecontroleerd',
    );
    await page.locator('#plan-movie').fill('De maan van papier');
    await page.locator('#plan-cinema').fill('Fictief Filmhuis');
    await page.locator('#plan-date').fill('2030-04-12');
    await page.locator('#plan-time').fill('19:30');
    await page.getByRole('button', { name: 'Bewaar filmplan' }).click();
    await expect(page.getByTestId('hq-next')).toBeVisible();
    await page
      .getByRole('button', {
        name: 'Ik gebruik mijn eigen account en geldige pas — A',
      })
      .click();
    await expect(page.getByTestId('manual-status-A')).toHaveText(
      'Bezig — eigen controles',
    );
    await expect(page.getByTestId('manual-status-B')).toHaveText(
      'Nog niet gecontroleerd',
    );
    await expect(page.getByTestId('manual-match')).toContainText('UNKNOWN');
    await page.reload();
    await expect(page.locator('#plan-movie')).toHaveValue('');
  } finally {
    await browser.close();
  }
});

test('manual flow: independent reports, keyboard focus, partial recovery and no verified seat claim', async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH ?? chromium.executablePath(),
    args: ['--no-sandbox'],
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 320, height: 900 },
    });
    const coordinator = new Coordinator();
    const reads = await attachMockTransport(page, coordinator);
    await page.goto('http://127.0.0.1:4173/sidepanel.html');
    await page.locator('#plan-movie').pressSequentially('De maan van papier');
    await expect(page.locator('#plan-movie')).toHaveValue('De maan van papier');
    await page.locator('#plan-cinema').fill('Fictief Filmhuis');
    await page.locator('#plan-date').fill('2030-04-12');
    await page.locator('#plan-time').fill('19:30');
    await page.locator('#plan-hall').fill('Zaal 2');
    await page.getByRole('button', { name: 'Bewaar filmplan' }).focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#tracks-title')).toBeFocused();
    for (const role of ['A', 'B']) {
      await page
        .getByText(`Voorstelling en stoel voor ${role} controleren`, {
          exact: true,
        })
        .click();
      await page.locator(`#row-${role}`).fill('F');
      await page.locator(`#seat-${role}`).fill(role === 'A' ? '10' : '11');
      const before = reads();
      await expect.poll(() => reads()).toBeGreaterThan(before);
      await expect(page.locator(`#row-${role}`)).toHaveValue('F');
      await page
        .getByRole('button', { name: `Bewaar eigen invoer ${role}` })
        .click();
    }
    const labels = [
      'Ik gebruik mijn eigen account en geldige pas',
      'Ik heb film, bioscoop, datum, tijd en zaal op Vue vergeleken',
      'Ik heb mijn stoel, gangpad en eventuele kosten op Vue gecontroleerd',
      'Ik heb mijn eigen overzicht op Vue gecontroleerd',
      'Ik meld dat ik zelf op Vue heb afgerond',
    ];
    for (const label of labels)
      await page
        .getByRole('button', { name: `${label} — A`, exact: true })
        .click();
    await expect(page.getByTestId('manual-status-A')).toHaveText(
      'Zelf gemeld afgerond',
    );
    await expect(page.getByTestId('manual-status-B')).toHaveText(
      'Nog niet gecontroleerd',
    );
    await expect(page.getByRole('status')).toContainText(
      'Partiële eigen melding',
    );
    await page
      .getByRole('button', { name: `${labels[0]} — B`, exact: true })
      .click();
    await page
      .getByRole('button', { name: `${labels[1]} — B`, exact: true })
      .click();
    await expect(page.getByTestId('manual-match')).toContainText(
      'MATCH — geen sitebewijs',
    );
    await expect(page.getByTestId('manual-adjacency')).toContainText(
      'niet geverifieerd naast elkaar',
    );
    const card = page.getByRole('article', { name: /Account B/ });
    await card
      .getByText('Probleem of opnieuw beginnen', { exact: true })
      .click();
    await card.getByRole('button', { name: 'Ik ben uitgelogd — B' }).click();
    await expect(page.getByTestId('manual-status-B')).toHaveText(
      'Opnieuw controleren',
    );
    await expect(page.getByTestId('manual-status-A')).toHaveText(
      'Zelf gemeld afgerond',
    );
    const width = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    }));
    expect(width.scroll).toBeLessThanOrEqual(width.client);
    await page.screenshot({
      path: 'test-results/sprint02-manual-partial.png',
      fullPage: true,
    });
    await page
      .getByRole('button', { name: 'Simulatie / technische proef' })
      .click();
    await expect(page.getByLabel('Scenario', { exact: true })).toBeVisible();
    await page
      .getByRole('button', { name: 'Boekingsassistent', exact: true })
      .click();
    await expect(page.getByTestId('manual-status-A')).toHaveText(
      'Zelf gemeld afgerond',
    );
    await page.getByText('Alle gegevens wissen', { exact: true }).click();
    await page
      .getByRole('button', {
        name: 'Wis alle tijdelijke gegevens',
        exact: true,
      })
      .click();
    await expect(page.locator('#plan-movie')).toHaveValue('');
    await expect(page.getByTestId('manual-status-A')).toHaveText(
      'Nog niet gecontroleerd',
    );
  } finally {
    await browser.close();
  }
});

test('Chrome API permission failure degrades to a functional local planner', async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH ?? chromium.executablePath(),
    args: ['--no-sandbox'],
  });
  try {
    const page = await browser.newPage();
    await page.addInitScript(() =>
      Object.defineProperty(globalThis, 'chrome', {
        value: {
          runtime: {
            sendMessage: async () => ({
              ok: false,
              code: 'BROWSER_UNAVAILABLE',
              error: 'Browsertoestemming niet beschikbaar.',
            }),
          },
        },
      }),
    );
    await page.goto('http://127.0.0.1:4173/sidepanel.html');
    await expect(
      page.getByText('Alleen lokaal in dit paneel.', { exact: false }),
    ).toBeVisible();
    await expect(page.getByTestId('manual-status-A')).toHaveText(
      'Nog niet gecontroleerd',
    );
    await expect(page.locator('#plan-movie')).toBeEditable();
    await expect(page.getByTestId('manual-match')).toContainText('UNKNOWN');
  } finally {
    await browser.close();
  }
});

test('popup buddy CRUD, keyboard confirmation and shared panel selection preserve A while B resets', async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH ?? chromium.executablePath(),
    args: ['--no-sandbox'],
  });
  try {
    const worker = new Coordinator();
    const control: MockControl = { unavailable: false, worker, launches: [] };
    const popup = await browser.newPage({
      viewport: { width: 320, height: 900 },
    });
    const panel = await browser.newPage({
      viewport: { width: 320, height: 900 },
    });
    await attachMockTransport(popup, worker, control);
    await attachMockTransport(panel, worker, control);
    await popup.goto('http://127.0.0.1:4173/popup.html');
    await expect(
      popup.getByRole('heading', { name: 'Met wie ga je naar de film?' }),
    ).toBeVisible();
    await expect(
      popup.getByText('Nog geen buddy’s.', { exact: false }),
    ).toBeVisible();
    await popup.getByLabel('Bijnaam toevoegen').fill('fictief@invalid.test');
    await popup
      .getByRole('button', { name: 'Voeg buddy toe', exact: true })
      .click();
    await expect(popup.getByRole('alert')).toContainText('Geen e-mail');
    await popup.getByLabel('Bijnaam toevoegen').fill('Filmmaatje');
    await popup
      .getByRole('button', { name: 'Voeg buddy toe', exact: true })
      .focus();
    await popup.keyboard.press('Enter');
    await expect(
      popup.getByRole('button', { name: 'Kies Filmmaatje', exact: true }),
    ).toBeVisible();
    await popup
      .getByRole('button', { name: 'Hernoem Filmmaatje', exact: true })
      .click();
    await popup.getByLabel('Nieuwe bijnaam').fill('Avondbuddy');
    await popup
      .getByRole('button', { name: 'Bewaar bijnaam', exact: true })
      .click();
    await popup
      .getByRole('button', { name: 'Kies Avondbuddy', exact: true })
      .click();
    await expect(
      popup.getByRole('heading', { name: 'B begint opnieuw' }),
    ).toBeFocused();
    await popup.getByRole('button', { name: 'Annuleren', exact: true }).click();
    expect(worker.buddy.selectedId).toBeNull();
    await popup
      .getByRole('button', { name: 'Kies Avondbuddy', exact: true })
      .click();
    await popup
      .getByRole('button', { name: 'Bevestig wijziging en wis B', exact: true })
      .focus();
    await popup.keyboard.press('Enter');
    await expect(popup.getByTestId('popup-selection')).toContainText(
      'Ik + Avondbuddy',
    );
    await popup
      .getByRole('button', { name: 'Open boekingsassistent', exact: true })
      .focus();
    await popup.keyboard.press('Enter');
    expect(control.launches).toEqual([{ windowId: 17, gesture: true }]);
    await popup.screenshot({
      path: 'test-results/seatbuddies-popup.png',
      fullPage: true,
    });
    await panel.goto('http://127.0.0.1:4173/sidepanel.html');
    await expect(panel.getByTestId('panel-buddy')).toContainText(
      'Ik + Avondbuddy',
    );
    await panel.locator('#plan-movie').fill('De maan van papier');
    await panel.locator('#plan-cinema').fill('Fictief Filmhuis');
    await panel.locator('#plan-date').fill('2030-04-12');
    await panel.locator('#plan-time').fill('19:30');
    await panel.locator('#plan-hall').fill('Zaal 2');
    await panel
      .getByRole('button', { name: 'Bewaar filmplan', exact: true })
      .click();
    for (const role of ['A', 'B'])
      await panel
        .getByRole('button', {
          name: `Ik gebruik mijn eigen account en geldige pas — ${role}`,
          exact: true,
        })
        .click();
    for (const role of ['A', 'B']) {
      await panel
        .getByText(`Voorstelling en stoel voor ${role} controleren`, {
          exact: true,
        })
        .click();
      await panel.locator(`#row-${role}`).fill(role === 'A' ? 'K' : 'X');
    }
    await popup.getByLabel('Bijnaam toevoegen').fill('Nieuw maatje');
    await popup
      .getByRole('button', { name: 'Voeg buddy toe', exact: true })
      .click();
    await popup
      .getByRole('button', { name: 'Kies Nieuw maatje', exact: true })
      .click();
    await popup
      .getByRole('button', { name: 'Bevestig wijziging en wis B', exact: true })
      .click();
    await expect(panel.getByTestId('panel-buddy')).toContainText(
      'Ik + Nieuw maatje',
    );
    await expect(panel.getByTestId('manual-status-A')).toHaveText(
      'Bezig — eigen controles',
    );
    await expect(panel.getByTestId('manual-status-B')).toHaveText(
      'Opnieuw controleren',
    );
    await expect(panel.getByTestId('manual-evidence-B')).toContainText(
      'UNKNOWN',
    );
    expect(worker.manual.tracks.A.completed).toEqual(['ACCOUNT']);
    expect(worker.manual.tracks.B.completed).toEqual([]);
    await expect(panel.locator('#row-A')).toHaveValue('K');
    await panel
      .getByText('Voorstelling en stoel voor B controleren', { exact: true })
      .click();
    await expect(panel.locator('#row-B')).toHaveValue('');
    await popup
      .getByRole('button', { name: 'Verwijder Nieuw maatje', exact: true })
      .click();
    await popup
      .getByRole('button', { name: 'Bevestig wijziging en wis B', exact: true })
      .click();
    await expect(panel.getByTestId('panel-buddy')).toContainText(
      'Ik + een buddy',
    );
    await expect(panel.getByTestId('manual-status-A')).toHaveText(
      'Bezig — eigen controles',
    );
    await panel.screenshot({
      path: 'test-results/seatbuddies-panel.png',
      fullPage: true,
    });
    await popup
      .getByRole('button', { name: 'Wis alle buddy’s', exact: true })
      .click();
    await expect(
      popup.getByText('Nog geen buddy’s.', { exact: false }),
    ).toBeVisible();
    await popup.getByLabel('Bijnaam toevoegen').fill('Onopgeslagen fictief');
    control.worker = new Coordinator();
    await expect(
      popup.getByText('Opnieuw gestart:', { exact: false }),
    ).toBeVisible();
    await expect(popup.getByLabel('Bijnaam toevoegen')).toHaveValue('');
    await expect(panel.locator('#plan-movie')).toHaveValue('');
    const width = await popup.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    }));
    expect(width.scroll).toBeLessThanOrEqual(width.client);
  } finally {
    await browser.close();
  }
});

test('fictional widget follows local Vue steps, unmounts cleanly and reports a denied panel launch', async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH ?? chromium.executablePath(),
    args: ['--no-sandbox'],
  });
  try {
    const worker = new Coordinator();
    worker.buddyCommand({
      type: 'BUDDY_MUTATE',
      generation: worker.generation,
      revision: 0,
      action: { kind: 'DEMO' },
      resetB: false,
    });
    worker.buddyCommand({
      type: 'BUDDY_MUTATE',
      generation: worker.generation,
      revision: worker.buddy.revision,
      action: { kind: 'SELECT', id: worker.buddy.roster[0]!.id },
      resetB: true,
    });
    const control: MockControl = {
      unavailable: false,
      worker,
      widgetReads: 0,
      panelDenied: true,
      launches: [],
    };
    const page = await browser.newPage({
      viewport: { width: 320, height: 900 },
    });
    await page.clock.install();
    await attachMockTransport(page, worker, control);
    await page.goto('http://127.0.0.1:4173/fixture.html');
    const widget = page.getByTestId('fixture-widget');
    await expect(widget).toHaveCount(1);
    await expect(widget).toContainText(
      'DEMO · NIET GEBOEKT · GEEN VUE INTEGRATIE',
    );
    await expect(
      widget.getByRole('heading', { name: 'Ik + Sanne' }),
    ).toBeVisible();
    await page
      .getByLabel('Fictieve schermstap')
      .selectOption('Fictieve stoelen');
    await expect(widget).toContainText('Fictieve stoelen');
    await expect(widget).toHaveCount(1);
    await widget
      .getByRole('button', { name: 'Open boekingsassistent' })
      .click();
    await expect(widget.getByRole('alert')).toContainText(
      'Chrome kon het zijpaneel niet openen',
    );
    expect(control.launches).toEqual([{ windowId: 17, gesture: true }]);
    await page.getByLabel('Toon fictieve widget').uncheck();
    await expect(widget).toHaveCount(0);
    const before = control.widgetReads;
    await page.clock.runFor(6000);
    expect(control.widgetReads).toBe(before);
    control.worker = new Coordinator();
    await page.getByLabel('Toon fictieve widget').check();
    await expect(widget).toHaveCount(1);
    await expect(
      widget.getByRole('heading', { name: 'Ik + een buddy' }),
    ).toBeVisible();
    await expect(widget).not.toContainText('Sanne');
    await page.screenshot({
      path: 'test-results/seatbuddies-widget.png',
      fullPage: true,
    });
    const width = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    }));
    expect(width.scroll).toBeLessThanOrEqual(width.client);
  } finally {
    await browser.close();
  }
});

test('Movie Night HQ: explicit remembered buddies, worker reset and draft-only restore never resurrect A/B proof', async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH ?? chromium.executablePath(),
    args: ['--no-sandbox'],
  });
  try {
    const port = memoryStorage();
    const worker = new Coordinator();
    const control: MockControl = {
      unavailable: false,
      worker,
      retained: new RetainedData(worker, port),
    };
    const popup = await browser.newPage({
      viewport: { width: 320, height: 900 },
    });
    const panel = await browser.newPage({
      viewport: { width: 320, height: 900 },
    });
    await attachMockTransport(popup, worker, control);
    await attachMockTransport(panel, worker, control);
    await popup.goto('http://127.0.0.1:4173/popup.html');
    const remember = popup.getByRole('checkbox', {
      name: 'Onthoud mijn buddy-bijnamen op dit apparaat',
    });
    await expect(remember).not.toBeChecked();
    await popup.getByLabel('Bijnaam toevoegen').fill('Filmmaatje');
    await popup
      .getByRole('button', { name: 'Voeg buddy toe', exact: true })
      .click();
    expect(port.local.values).toEqual({});
    await remember.focus();
    await popup.keyboard.press('Space');
    await expect(remember).toBeChecked();
    await expect(popup.getByTestId('retention-status')).toContainText(
      'niet standaard versleuteld',
    );
    expect(port.local.values[ROSTER_KEY]).toBeTruthy();
    await popup.reload();
    await expect(remember).toBeChecked();
    await popup.screenshot({
      path: 'test-results/seatbuddies-remembered-popup.png',
      fullPage: true,
    });
    await panel.goto('http://127.0.0.1:4173/sidepanel.html');
    await expect(panel.getByTestId('hq-next')).toHaveAttribute(
      'data-step',
      'PLAN',
    );
    for (const [field, value] of Object.entries({
      movie: 'De maan van papier',
      cinema: 'Fictief Filmhuis',
      date: '2030-04-12',
      time: '19:30',
      hall: 'Zaal 2',
    }))
      await panel.locator(`#plan-${field}`).fill(value);
    await panel
      .getByRole('button', { name: 'Bewaar filmplan', exact: true })
      .click();
    await expect(panel.getByTestId('hq-next')).toHaveAttribute(
      'data-step',
      'ACCOUNT',
    );
    await panel
      .getByRole('button', {
        name: 'Ik gebruik mijn eigen account en geldige pas — A',
        exact: true,
      })
      .click();
    await expect(panel.getByTestId('hq-A')).toContainText('1/5');
    await expect(panel.getByTestId('hq-B')).toContainText('0/5');
    await panel.locator('#plan-movie').fill('Onopgeslagen fictieve invoer');
    await popup
      .getByRole('button', { name: 'Hernoem Filmmaatje', exact: true })
      .click();
    await popup.getByLabel('Nieuwe bijnaam').fill('Avondbuddy');
    await popup
      .getByRole('button', { name: 'Bewaar bijnaam', exact: true })
      .click();
    await expect(
      panel.locator('.panel-buddies').getByRole('button', {
        name: 'Kies Avondbuddy',
        exact: true,
        includeHidden: true,
      }),
    ).toHaveCount(1);
    await expect(panel.locator('#plan-movie')).toHaveValue(
      'Onopgeslagen fictieve invoer',
    );
    await panel.locator('#plan-movie').fill('De maan van papier');
    await panel
      .getByText('Filmplan-concept veilig bewaren of herstellen', {
        exact: true,
      })
      .click();
    await panel
      .getByRole('button', {
        name: 'Bewaar tijdelijk filmplan-concept',
        exact: true,
      })
      .click();
    await expect(
      panel.getByRole('button', { name: 'Herstel concept', exact: true }),
    ).toBeEnabled();
    expect(port.session.values[DRAFT_KEY]).toBeTruthy();
    control.worker = new Coordinator();
    control.retained = new RetainedData(control.worker, port);
    await expect(panel.locator('#plan-movie')).toHaveValue('');
    await expect(
      popup.getByRole('button', { name: 'Kies Avondbuddy', exact: true }),
    ).toBeVisible();
    await expect(panel.getByTestId('hq-A')).toContainText('0/5');
    await expect(panel.getByTestId('hq-B')).toContainText('0/5');
    await panel
      .getByRole('button', { name: 'Herstel concept', exact: true })
      .focus();
    await panel.keyboard.press('Enter');
    await expect(panel.locator('#plan-movie')).toHaveValue(
      'De maan van papier',
    );
    await expect(
      panel.getByText('Concept, opnieuw controleren', { exact: false }).first(),
    ).toBeVisible();
    await expect(panel.getByTestId('hq-next')).toHaveAttribute(
      'data-step',
      'PLAN',
    );
    expect(control.worker.manual.plan).toBeNull();
    expect(control.worker.manual.tracks.A.completed).toEqual([]);
    await panel
      .getByRole('button', { name: 'Bewaar filmplan', exact: true })
      .click();
    await expect(panel.getByTestId('hq-next')).toHaveAttribute(
      'data-step',
      'ACCOUNT',
    );
    for (const role of ['A', 'B']) {
      await panel
        .getByText(`Voorstelling en stoel voor ${role} controleren`, {
          exact: true,
        })
        .click();
      await panel.locator(`#row-${role}`).fill('F');
      await panel.locator(`#seat-${role}`).fill(role === 'A' ? '10' : '11');
      await panel
        .getByRole('button', {
          name: `Bewaar eigen invoer ${role}`,
          exact: true,
        })
        .click();
    }
    await expect(panel.getByTestId('hq-seats')).toContainText(
      'CONSECUTIVE_UNVERIFIED',
    );
    await panel
      .locator('.movie-night-hq')
      .screenshot({ path: 'test-results/seatbuddies-hq.png' });
    const size = await panel.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    }));
    expect(size.scroll).toBeLessThanOrEqual(size.client);
    await popup
      .getByRole('button', { name: 'Vergeet opgeslagen buddies', exact: true })
      .click();
    await expect(remember).not.toBeChecked();
    expect(port.local.values).toEqual({});
    expect(port.session.values).toEqual({});
  } finally {
    await browser.close();
  }
});

test('unavailable retention is visibly unknown and disabled while temporary buddies and manual planning remain usable', async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH ?? chromium.executablePath(),
    args: ['--no-sandbox'],
  });
  try {
    const port = memoryStorage();
    port.local.setAccessLevel = async () => {
      throw new Error('Fictional unsupported storage');
    };
    const worker = new Coordinator();
    const control: MockControl = {
      unavailable: false,
      worker,
      retained: new RetainedData(worker, port),
    };
    const popup = await browser.newPage({
      viewport: { width: 320, height: 900 },
    });
    const panel = await browser.newPage({
      viewport: { width: 320, height: 900 },
    });
    await attachMockTransport(popup, worker, control);
    await attachMockTransport(panel, worker, control);
    await popup.goto('http://127.0.0.1:4173/popup.html');
    const consent = popup.getByRole('checkbox', {
      name: 'Onthoud mijn buddy-bijnamen op dit apparaat',
    });
    await expect(consent).toBeDisabled();
    await expect
      .poll(() =>
        consent.evaluate((input) => (input as HTMLInputElement).indeterminate),
      )
      .toBe(true);
    await expect(popup.getByTestId('retention-status')).toContainText(
      'verwijderen niet bevestigd',
    );
    await popup.getByLabel('Bijnaam toevoegen').fill('Filmmaatje');
    await popup
      .getByRole('button', { name: 'Voeg buddy toe', exact: true })
      .click();
    await expect(
      popup.getByRole('button', { name: 'Kies Filmmaatje', exact: true }),
    ).toBeVisible();
    expect(port.local.values).toEqual({});
    expect(port.local.calls).toEqual([]);
    await panel.goto('http://127.0.0.1:4173/sidepanel.html');
    for (const [field, value] of Object.entries({
      movie: 'De maan van papier',
      cinema: 'Fictief Filmhuis',
      date: '2030-04-12',
      time: '19:30',
      hall: 'Zaal 2',
    }))
      await panel.locator(`#plan-${field}`).fill(value);
    await panel
      .getByRole('button', { name: 'Bewaar filmplan', exact: true })
      .click();
    await expect(panel.getByTestId('hq-next')).toHaveAttribute(
      'data-step',
      'ACCOUNT',
    );
    expect(port.local.values).toEqual({});
  } finally {
    await browser.close();
  }
});
