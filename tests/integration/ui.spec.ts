import {
  exerciseSeatPairLab,
  exerciseManualCategory,
} from '../helpers/zero-extra-workflow';
import { openSimulation, firstPlanViaUI } from '../helpers/browser-workflow';
import {
  openInputs,
  enterSeats,
  reviewViaUI,
  planViaUI,
} from '../helpers/browser-workflow';
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
  normalWindows?: unknown[];
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
          Date.now,
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
  await page.exposeFunction('mockNormalWindow', (options: unknown) => {
    control.normalWindows?.push(options);
    return { id: 18 };
  });
  await page.addInitScript(() => {
    Object.defineProperty(globalThis, 'chrome', {
      value: {
        windows: {
          getCurrent: async () => ({ id: 17 }),
          create: (options: unknown) =>
            Reflect.get(globalThis, 'mockNormalWindow')(options),
        },
        sidePanel: {
          open: ({ windowId }: { windowId: number }) => {
            const bridge = Reflect.get(globalThis, 'mockPanelOpen') as (
              id: number,
              active: boolean,
            ) => Promise<void>;
            return bridge(windowId, navigator.userActivation.isActive);
          },
        },
        storage: {
          local: { get: async () => ({}), setAccessLevel: async () => {} },
          session: { get: async () => ({}), setAccessLevel: async () => {} },
        },
        runtime: {
          id: 'fictional-extension',
          getURL: (path: string) =>
            `chrome-extension://fictional-extension/${path}`,
          getManifest: () => ({
            manifest_version: 3,
            version: '0.10.1',
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
    await openSimulation(page);
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
    await openSimulation(page);
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
    await enterSeats(page);
    await reviewViaUI(page);
    await expect(page.getByTestId('manual-evidence-A')).toContainText(
      'MANUAL_SELF_REPORT',
    );
    await page
      .getByRole('button', {
        name: 'Ik gebruik mijn eigen account en geldige pas — A',
      })
      .click();
    control.worker = new Coordinator();
    await expect(page.getByTestId('lifecycle-notice')).toBeVisible();
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
    await expect(report).toContainText('"extensionVersion": "0.10.1"');
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
    await page.locator('#plan-movie').fill('Te wissen lokaal concept');
    const reconnect = page.getByRole('button', {
      name: 'Verbind opnieuw en wis tijdelijke gegevens',
    });
    await reconnect.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('lifecycle-notice')).toBeVisible();
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
    await expect(page.getByTestId('hq-next')).toContainText('Zaal UNKNOWN');
    await expect(
      page.getByRole('button', {
        name: 'Ik heb de gegevens gecontroleerd — naar de eigen stappen',
      }),
    ).toBeDisabled();
    await page.locator('#plan-hall').fill('Zaal 2');
    await page
      .getByRole('button', { name: 'Bewaar filmplan', exact: true })
      .click();
    await enterSeats(page);
    await reviewViaUI(page);
    await page
      .getByRole('button', {
        name: 'Ik gebruik mijn eigen account en geldige pas — A',
      })
      .click();
    await expect(page.getByTestId('manual-status-A')).toHaveText(
      'Bezig — eigen controles',
    );
    await expect(page.getByTestId('manual-status-B')).toHaveCount(0);
    await expect(page.getByTestId('inactive-B')).toBeVisible();
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
    await expect(page.locator('#review-title')).toBeFocused();
    await page
      .getByRole('button', { name: 'Ook met buddy plannen', exact: true })
      .click();
    for (const role of ['A', 'B']) {
      await openInputs(page, role);
      await page.locator(`#row-${role}`).fill('F');
      await page.locator(`#seat-${role}`).fill(role === 'A' ? '10' : '11');
      const before = reads();
      await expect.poll(() => reads()).toBeGreaterThan(before);
      await expect(page.locator(`#row-${role}`)).toHaveValue('F');
      await page
        .getByRole('button', { name: `Bewaar eigen invoer ${role}` })
        .click();
    }
    await reviewViaUI(page);
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
    await expect(
      page.getByRole('heading', {
        name: 'Partiële eigen melding — controleer elke uitkomst',
        exact: true,
      }),
    ).toBeVisible();
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
    await openSimulation(page);
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
    await expect(panel.getByTestId('inactive-B')).toBeVisible();
    await panel
      .getByRole('button', { name: 'Ook met buddy plannen', exact: true })
      .click();
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
    await enterSeats(panel, ['A', 'B']);
    await reviewViaUI(panel);
    for (const role of ['A', 'B'])
      await panel
        .getByRole('button', {
          name: `Ik gebruik mijn eigen account en geldige pas — ${role}`,
          exact: true,
        })
        .click();
    for (const role of ['A', 'B']) {
      await openInputs(panel, role);
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
    await openInputs(panel, 'B');
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
    await expect(popup.getByTestId('popup-notice')).toBeVisible();
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
      'PREFLIGHT',
    );
    await panel
      .getByRole('button', { name: 'Ook met buddy plannen', exact: true })
      .click();
    await enterSeats(panel, ['A', 'B']);
    await reviewViaUI(panel);
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
    await expect(panel.getByTestId('hq-B')).toHaveCount(0);
    expect(control.worker.manual.planningMode).toBe('SOLO');
    expect(control.worker.manual.review).toBeNull();
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
      'PREFLIGHT',
    );
    expect(control.worker.manual.planningMode).toBe('SOLO');
    await panel
      .getByRole('button', { name: 'Ook met buddy plannen', exact: true })
      .click();
    for (const role of ['A', 'B']) {
      await openInputs(panel, role);
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
      'PREFLIGHT',
    );
    expect(port.local.values).toEqual({});
  } finally {
    await browser.close();
  }
});

test('Projector Ready: deliberate solo/together, honest preflight, local B reset confirmation and stable keyboard announcements', async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH ?? chromium.executablePath(),
    args: ['--no-sandbox'],
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 320, height: 900 },
      reducedMotion: 'reduce',
    });
    const worker = new Coordinator();
    const reads = await attachMockTransport(page, worker);
    await page.goto('http://127.0.0.1:4173/sidepanel.html');
    await expect(
      page.getByRole('button', { name: 'Ik ga alleen', exact: true }),
    ).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('inactive-B')).toBeVisible();
    await planViaUI(page);
    await expect(page.getByTestId('manual-status-B')).toHaveCount(0);
    await enterSeats(page);
    await expect(page.getByTestId('review-A')).toContainText('F10');
    await expect(page.getByTestId('review-B')).toHaveCount(0);
    await reviewViaUI(page);
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('hq-A')).toContainText('1/5');
    await page
      .getByRole('button', { name: 'Ook met buddy plannen', exact: true })
      .focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#mode-title')).toBeFocused();
    await expect(page.getByTestId('hq-A')).toContainText('1/5');
    await enterSeats(page, ['B']);
    await reviewViaUI(page);
    await expect(page.getByTestId('hq-seats')).toContainText(
      'CONSECUTIVE_UNVERIFIED',
    );
    await page
      .locator('.preflight')
      .screenshot({ path: 'test-results/seatbuddies-preflight.png' });
    await openInputs(page, 'B');
    await page.locator('#row-B').fill('G');
    await expect(
      page.getByRole('button', {
        name: 'Ik heb de gegevens gecontroleerd — naar de eigen stappen',
      }),
    ).toBeDisabled();
    await page
      .getByRole('button', { name: 'Bewaar eigen invoer B', exact: true })
      .click();
    expect(worker.manual.review).toBeNull();
    await expect(page.getByTestId('hq-A')).toContainText('1/5');
    await reviewViaUI(page);
    await page
      .getByRole('button', { name: 'Ik ga alleen', exact: true })
      .focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#solo-confirm-title')).toBeFocused();
    await page
      .getByRole('button', { name: 'Behoud buddytraject', exact: true })
      .click();
    expect(worker.manual.planningMode).toBe('TOGETHER');
    await page
      .getByRole('button', { name: 'Ik ga alleen', exact: true })
      .click();
    await page
      .getByRole('button', { name: 'Wis lokaal B en plan solo', exact: true })
      .focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#mode-title')).toBeFocused();
    await expect(page.getByTestId('inactive-B')).toBeVisible();
    await expect(page.getByTestId('hq-A')).toContainText('1/5');
    expect(worker.manual.tracks.B.seat.row).toBe('');
    await page.evaluate(() => {
      Reflect.set(window, 'announcements', 0);
      new MutationObserver(() =>
        Reflect.set(
          window,
          'announcements',
          Number(Reflect.get(window, 'announcements')) + 1,
        ),
      ).observe(document.querySelector('[data-testid="announcer"]')!, {
        childList: true,
        characterData: true,
        subtree: true,
      });
    });
    const before = reads();
    await expect.poll(() => reads()).toBeGreaterThan(before + 1);
    expect(
      await page.evaluate(() => Reflect.get(window, 'announcements')),
    ).toBe(0);
    expect(
      await page.evaluate(
        () => matchMedia('(prefers-reduced-motion: reduce)').matches,
      ),
    ).toBe(true);
    const width = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    }));
    expect(width.scroll).toBeLessThanOrEqual(width.client);
    const ratios = await page.evaluate(() => {
      const luminance = (rgb: string) => {
        const values = rgb
          .match(/\d+/g)!
          .slice(0, 3)
          .map(Number)
          .map((value) => {
            const c = value / 255;
            return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
          });
        return values[0]! * 0.2126 + values[1]! * 0.7152 + values[2]! * 0.0722;
      };
      return [
        'button:not(.secondary):not(.text-button)',
        '.planning-mode button',
      ].map((selector) => {
        const style = getComputedStyle(document.querySelector(selector)!);
        const text = luminance(style.color),
          background = luminance(style.backgroundColor);
        return (
          (Math.max(text, background) + 0.05) /
          (Math.min(text, background) + 0.05)
        );
      });
    });
    for (const ratio of ratios) expect(ratio).toBeGreaterThanOrEqual(4.5);
    await expect(
      page.getByRole('button', { name: 'Ook met buddy plannen', exact: true }),
    ).toHaveCSS('min-height', '44px');

    await page.screenshot({
      path: 'test-results/seatbuddies-projector-review.png',
      fullPage: true,
    });
  } finally {
    await browser.close();
  }
});

test('diagnostic copy previews exact allowlisted text, waits for clipboard success and offers manual fallback on denial', async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH ?? chromium.executablePath(),
    args: ['--no-sandbox'],
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 320, height: 900 },
    });
    await attachMockTransport(page, new Coordinator());
    const copied: string[] = [];
    let finish: (() => void) | undefined;
    let denied = false;
    await page.exposeFunction('writeDiagnostic', async (text: string) => {
      if (denied)
        throw new Error('Fictional denied clipboard with private details');
      copied.push(text);
      await new Promise<void>((resolve) => {
        finish = resolve;
      });
    });
    await page.addInitScript(() =>
      Object.defineProperty(navigator, 'clipboard', {
        value: {
          writeText: (text: string) =>
            (
              Reflect.get(window, 'writeDiagnostic') as (
                text: string,
              ) => Promise<void>
            )(text),
        },
      }),
    );
    await page.goto('http://127.0.0.1:4173/sidepanel.html');
    await planViaUI(page, true);
    await enterSeats(page, ['A', 'B']);
    await page
      .getByText('Diagnostiek zonder privégegevens', { exact: true })
      .click();
    await page
      .getByRole('button', { name: 'Voer zelfcontrole uit', exact: true })
      .focus();
    await page.keyboard.press('Enter');
    const report = page.getByTestId('diagnostic-report');
    await expect(report).toBeFocused();
    const preview = await report.innerText();
    expect(JSON.parse(preview)).toMatchObject({
      build: { version: '0.10.1' },
      productionAdapter: 'DISABLED_G0',
    });
    for (const secret of [
      'De maan van papier',
      'Fictief Filmhuis',
      '2030-04-12',
      '19:30',
      'Zaal 2',
      'F10',
      'F11',
      'fictional-extension',
      'fictional-doc',
    ])
      expect(preview).not.toContain(secret);
    const copy = page.getByRole('button', {
      name: 'Kopieer technische diagnose',
      exact: true,
    });
    await copy.focus();
    await page.keyboard.press('Enter');
    await expect.poll(() => copied.length).toBe(1);
    await expect(copy).toBeDisabled();
    await expect(
      page.getByText('Technische diagnose gekopieerd.', { exact: false }),
    ).toHaveCount(0);
    expect(copied[0]).toBe(preview);
    finish?.();
    await expect(
      page.getByText('Technische diagnose gekopieerd.', { exact: false }),
    ).toBeVisible();
    denied = true;
    await copy.click();
    await expect(page.getByRole('alert')).toContainText(
      'Kopiëren niet toegestaan',
    );
    await expect(report).toBeFocused();
    expect(await page.evaluate(() => window.getSelection()?.toString())).toBe(
      preview,
    );
    await expect(page.getByRole('alert')).not.toContainText('private details');
    await expect(
      page.getByRole('link', { name: 'Meld een probleem ↗', exact: true }),
    ).toHaveAttribute(
      'href',
      'https://github.com/johndobry89/SeatBuddy/issues/new',
    );
    expect(copied).toHaveLength(1);
  } finally {
    await browser.close();
  }
});

test('changed fictional schema clears previous fixture evidence and offers UNKNOWN/manual guidance', async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH ?? chromium.executablePath(),
    args: ['--no-sandbox'],
  });
  try {
    const page = await browser.newPage();
    const worker = new Coordinator();
    await attachMockTransport(page, worker);
    await page.goto('http://127.0.0.1:4173/fixture.html');
    await page
      .getByRole('button', { name: 'Koppel deze fictieve tab', exact: true })
      .click();
    await page
      .getByRole('button', {
        name: 'Verstuur fictieve waarneming',
        exact: true,
      })
      .click();
    expect(worker.sessions.A.observation?.status).toBe('SELECTED');
    await page
      .getByLabel('Fictief adapterschema', { exact: true })
      .selectOption('v2');
    await page
      .getByRole('button', {
        name: 'Verstuur fictieve waarneming',
        exact: true,
      })
      .click();
    await expect(
      page.getByText('Status UNKNOWN — fictief schema gewijzigd.', {
        exact: false,
      }),
    ).toBeVisible();
    expect(worker.sessions.A.observation).toBeNull();
    expect(worker.sessions.A.binding).toBeNull();
  } finally {
    await browser.close();
  }
});

for (const together of [false, true])
  test(`friction audit: ${together ? 'TOGETHER' : 'SOLO'} required main-path actions`, async () => {
    const browser = await chromium.launch({
      executablePath: process.env.CHROMIUM_PATH ?? chromium.executablePath(),
      args: ['--no-sandbox'],
    });
    try {
      const page = await browser.newPage();
      await attachMockTransport(page, new Coordinator());
      await page.goto('http://127.0.0.1:4173/sidepanel.html');
      await page.evaluate(() => {
        Reflect.set(window, 'audit', { clicks: 0, entries: 0 });
        document.addEventListener(
          'click',
          (event) => {
            if (
              event.isTrusted &&
              (event.target as Element).closest('button,input')
            ) {
              const a = Reflect.get(window, 'audit') as { clicks: number };
              a.clicks++;
            }
          },
          true,
        );
        document.addEventListener(
          'input',
          (event) => {
            if (event.isTrusted) {
              const a = Reflect.get(window, 'audit') as { entries: number };
              a.entries++;
            }
          },
          true,
        );
      });
      async function field(id: string, value: string) {
        await page.locator(id).click();
        await page.locator(id).fill(value);
      }
      for (const [key, value] of Object.entries({
        movie: 'De maan van papier',
        cinema: 'Fictief Filmhuis',
        date: '2030-04-12',
        time: '19:30',
        hall: 'Zaal 2',
      }))
        await field(`#plan-${key}`, value);
      if (together)
        await page
          .getByRole('button', { name: 'Ook met buddy plannen', exact: true })
          .click();
      for (const role of together ? ['A', 'B'] : ['A']) {
        await field(`#plan-row-${role}`, 'F');
        await field(`#plan-seat-${role}`, role === 'A' ? '10' : '11');
      }
      await page
        .getByRole('button', { name: 'Bewaar filmplan', exact: true })
        .click();
      // Count an ordinary pointer route: reviewViaUI uses Enter, so click explicitly here.
      await page
        .getByRole('button', {
          name: 'Ik heb de gegevens gecontroleerd — naar de eigen stappen',
          exact: true,
        })
        .click();
      for (const role of together ? ['A', 'B'] : ['A'])
        for (let i = 0; i < 5; i++)
          await page.locator(`#next-own-${role}`).click();
      const measured = await page.evaluate(() => Reflect.get(window, 'audit'));
      expect(measured).toEqual({
        clicks: together ? 22 : 14,
        entries: together ? 7 : 5,
      });
      console.log(
        `UX_FRICTION ${together ? 'TOGETHER' : 'SOLO'} ${JSON.stringify(measured)}`,
      );
    } finally {
      await browser.close();
    }
  });

test('First-Run Forge: isolated local self-test preserves the real plan, remembered buddies, selected buddy, draft and proof across repeated runs', async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH ?? chromium.executablePath(),
    args: ['--no-sandbox'],
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 320, height: 900 },
    });
    const worker = new Coordinator();
    const port = memoryStorage();
    const control: MockControl = {
      worker,
      unavailable: false,
      retained: new RetainedData(worker, port),
    };
    await attachMockTransport(page, worker, control);
    await page.goto('http://127.0.0.1:4173/sidepanel.html');
    await page.getByText('Buddy kiezen of beheren', { exact: true }).click();
    await page
      .getByLabel('Bijnaam toevoegen', { exact: true })
      .fill('Fictief maatje');
    await page
      .getByRole('button', { name: 'Voeg buddy toe', exact: true })
      .click();
    const remember = page.getByRole('checkbox', {
      name: 'Onthoud mijn buddy-bijnamen op dit apparaat',
      exact: true,
    });
    // Consent is controlled by the asynchronously acknowledged storage result.
    await expect(remember).not.toBeChecked();
    await remember.click();
    await expect(remember).toBeChecked();
    await page
      .getByRole('button', { name: 'Kies Fictief maatje', exact: true })
      .click();
    await page
      .getByRole('button', { name: 'Bevestig wijziging en wis B', exact: true })
      .click();
    await firstPlanViaUI(page, true);
    await reviewViaUI(page);
    await page.locator('#next-own-A').click();
    await page
      .getByText('Filmplan-concept veilig bewaren of herstellen', {
        exact: true,
      })
      .click();
    await page
      .getByRole('button', {
        name: 'Bewaar tijdelijk filmplan-concept',
        exact: true,
      })
      .click();
    const before = worker.snapshot(Date.now(), false),
      local = structuredClone(port.local.values),
      session = structuredClone(port.session.values);
    await page
      .getByText('Diagnostiek zonder privégegevens', { exact: true })
      .click();
    for (let i = 0; i < 2; i++) {
      await page
        .getByRole('button', { name: 'Controleer SeatBuddies', exact: true })
        .focus();
      await page.keyboard.press('Enter');
      await expect(page.getByTestId('local-test-result')).toHaveText(
        'Lokale proef geslaagd',
      );
      await expect(page.getByTestId('local-test-result')).toBeFocused();
      expect(worker.snapshot(Date.now(), false)).toEqual(before);
      expect(port.local.values).toEqual(local);
      expect(port.session.values).toEqual(session);
    }
    const preview = await page.getByTestId('local-test-report').innerText();
    for (const value of [
      'Fictief maatje',
      'De maan van papier',
      'Fictief Filmhuis',
      '2030-04-12',
      '19:30',
      'F10',
      'F11',
      before.generation,
      'fictional-extension',
    ])
      expect(preview).not.toContain(value);
    expect(JSON.parse(preview).kind).toBe('FICTIONAL_TEST');
    await expect(page.getByTestId('hq-A')).toContainText('1/5');
    control.worker = new Coordinator();
    control.retained = new RetainedData(control.worker, port);
    await expect(page.getByTestId('hq-A')).toContainText('0/5');
    expect(control.worker.manual.planningMode).toBe('SOLO');
    expect(control.worker.manual.review).toBeNull();
    await expect(page.getByTestId('local-test-result')).toHaveText(
      'Lokale proef geslaagd',
    ); // Explicit fictional scope, not worker validation.
    await page
      .locator('.local-self-test')
      .screenshot({ path: 'test-results/seatbuddies-local-test.png' });
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    ).toBe(true);
  } finally {
    await browser.close();
  }
});

test('local self-test is cancellable, guards rapid repeat, shares the safe copy renderer and clears superseded previews', async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH ?? chromium.executablePath(),
    args: ['--no-sandbox'],
  });
  try {
    const page = await browser.newPage();
    await attachMockTransport(page, new Coordinator());
    const copied: string[] = [];
    await page.exposeFunction('testCopy', (value: string) => {
      copied.push(value);
    });
    await page.addInitScript(() =>
      Object.defineProperty(navigator, 'clipboard', {
        value: {
          writeText: (value: string) =>
            (
              Reflect.get(window, 'testCopy') as (text: string) => Promise<void>
            )(value),
        },
      }),
    );
    await page.goto('http://127.0.0.1:4173/sidepanel.html');
    await page
      .getByText('Diagnostiek zonder privégegevens', { exact: true })
      .click();
    await page.clock.install();
    await page.clock.pauseAt(new Date());
    const run = page.getByRole('button', {
      name: 'Controleer SeatBuddies',
      exact: true,
    });
    await run.click();
    await expect(run).toBeDisabled();
    await run.dispatchEvent('click');
    await page
      .getByRole('button', { name: 'Annuleer lokale proef', exact: true })
      .click();
    await page.clock.runFor(200);
    await expect(page.getByTestId('local-test-report')).toHaveCount(0);
    await expect(
      page.getByText('Lokale proef geannuleerd.', { exact: false }),
    ).toBeVisible();
    await run.click();
    await page.clock.runFor(200);
    await expect(page.getByTestId('local-test-result')).toHaveText(
      'Lokale proef geslaagd',
    );
    const preview = await page.getByTestId('local-test-report').innerText();
    await page
      .getByRole('button', {
        name: 'Kopieer lokale testsamenvatting',
        exact: true,
      })
      .click();
    await expect.poll(() => copied.length).toBe(1);
    expect(copied[0]).toBe(preview);
    await page
      .getByRole('button', { name: 'Voer zelfcontrole uit', exact: true })
      .click();
    await expect(page.getByTestId('local-test-report')).toHaveCount(0);
    await expect(page.getByTestId('diagnostic-report')).toBeVisible();
    await run.click();
    await page.clock.runFor(200);
    await expect(page.getByTestId('diagnostic-report')).toHaveCount(0);
    await expect(page.getByTestId('local-test-report')).toBeVisible();
  } finally {
    await browser.close();
  }
});

test('self-test in ordinary local preview shows NOT_TESTED capabilities and never external success', async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH ?? chromium.executablePath(),
    args: ['--no-sandbox'],
  });
  try {
    const page = await browser.newPage();
    await page.goto('http://127.0.0.1:4173/sidepanel.html');
    await page
      .getByText('Diagnostiek zonder privégegevens', { exact: true })
      .click();
    await page
      .getByRole('button', { name: 'Controleer SeatBuddies', exact: true })
      .click();
    await expect(page.getByTestId('local-test-result')).toHaveText(
      'Lokale proef niet volledig uitgevoerd',
    );
    await expect(page.getByTestId('local-check-CHROME_MANIFEST')).toContainText(
      'NOT_TESTED',
    );
    await expect(page.getByTestId('local-test-report')).not.toContainText(
      'CONFIRMED',
    );
  } finally {
    await browser.close();
  }
});

test('unsaved film and A input survive technical view changes and worker replacement as local draft only', async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH ?? chromium.executablePath(),
    args: ['--no-sandbox'],
  });
  try {
    const page = await browser.newPage();
    const control: MockControl = {
      worker: new Coordinator(),
      unavailable: false,
    };
    await attachMockTransport(page, control.worker, control);
    await page.goto('http://127.0.0.1:4173/sidepanel.html');
    await firstPlanViaUI(page, true);
    await reviewViaUI(page);
    await openInputs(page, 'A');
    await page.locator('#row-A').fill('K');
    await page.locator('#plan-movie').fill('Onopgeslagen fictief concept');
    await openSimulation(page);
    await page
      .getByRole('button', { name: 'Boekingsassistent', exact: true })
      .click();
    await expect(page.locator('#row-A')).toHaveValue('K');
    await expect(page.locator('#plan-movie')).toHaveValue(
      'Onopgeslagen fictief concept',
    );
    control.worker = new Coordinator();
    await expect(page.getByTestId('lifecycle-notice')).toBeVisible();
    await expect(page.locator('#plan-movie')).toHaveValue(
      'Onopgeslagen fictief concept',
    );
    await expect(page.locator('#row-A')).toHaveValue('K');
    await expect(page.getByTestId('retained-track-draft')).toBeVisible();
    expect(control.worker.manual.plan).toBeNull();
    expect(control.worker.manual.tracks.A.completed).toEqual([]);
    expect(control.worker.manual.tracks.A.seat.row).toBe('');
    expect(control.worker.manual.planningMode).toBe('SOLO');
    await page.getByText('Alle gegevens wissen', { exact: true }).click();
    await page
      .getByRole('button', {
        name: 'Wis alle tijdelijke gegevens',
        exact: true,
      })
      .click();
    await expect(page.locator('#plan-movie')).toHaveValue('');
  } finally {
    await browser.close();
  }
});

test('review regression: a buddy switch clears uncommitted initial B seats while preserving A', async () => {
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
      resetB: false,
      action: { kind: 'DEMO' },
    });
    const control: MockControl = { worker, unavailable: false };
    const page = await browser.newPage();
    const popup = await browser.newPage();
    await attachMockTransport(page, worker, control);
    await attachMockTransport(popup, worker, control);
    await page.goto('http://127.0.0.1:4173/sidepanel.html');
    await popup.goto('http://127.0.0.1:4173/popup.html');
    await popup
      .getByRole('button', { name: 'Kies Sanne', exact: true })
      .click();
    await popup
      .getByRole('button', { name: 'Bevestig wijziging en wis B', exact: true })
      .click();
    await expect(page.getByTestId('panel-selection')).toContainText('Sanne');
    await page
      .getByRole('button', { name: 'Ook met buddy plannen', exact: true })
      .click();
    await page.locator('#plan-row-A').fill('K');
    await page.locator('#plan-row-B').fill('X');
    await popup.getByRole('button', { name: 'Kies Mark', exact: true }).click();
    await popup
      .getByRole('button', { name: 'Bevestig wijziging en wis B', exact: true })
      .click();
    await expect(page.getByTestId('panel-buddy')).toContainText('Ik + Mark');
    await expect(page.locator('#plan-row-A')).toHaveValue('K');
    await expect(page.locator('#plan-row-B')).toHaveValue('');
  } finally {
    await browser.close();
  }
});

test('Integration Forge: an explicit reset on a replacement worker clears dirty local concepts', async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH ?? chromium.executablePath(),
    args: ['--no-sandbox'],
  });
  try {
    const page = await browser.newPage();
    const control: MockControl = {
      worker: new Coordinator(),
      unavailable: false,
    };
    await attachMockTransport(page, control.worker, control);
    await page.goto('http://127.0.0.1:4173/sidepanel.html');
    await firstPlanViaUI(page, true);
    await openInputs(page, 'A');
    await page.locator('#row-A').fill('K');
    await page.locator('#plan-movie').fill('Te wissen fictief concept');
    control.worker = new Coordinator();
    control.worker.reset(); // Another normal panel explicitly cleared this fresh worker.
    await expect(page.getByTestId('lifecycle-notice')).toBeVisible();
    await expect(page.locator('#plan-movie')).toHaveValue('');
    await expect(page.locator('#row-A')).toHaveValue('');
    await expect(page.getByTestId('retained-track-draft')).toHaveCount(0);
  } finally {
    await browser.close();
  }
});

test('Integration Forge: Begin A opnieuw discards dirty A fields and preserves B', async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH ?? chromium.executablePath(),
    args: ['--no-sandbox'],
  });
  try {
    const page = await browser.newPage();
    const worker = new Coordinator();
    await attachMockTransport(page, worker);
    await page.goto('http://127.0.0.1:4173/sidepanel.html');
    await firstPlanViaUI(page, true);
    const beforeB = structuredClone(worker.manual.tracks.B);
    await openInputs(page, 'A');
    await page.locator('#row-A').fill('K');
    await page
      .locator('.track')
      .first()
      .getByText('Probleem of opnieuw beginnen', { exact: true })
      .click();
    await page
      .getByRole('button', { name: 'Begin A opnieuw', exact: true })
      .click();
    await expect(page.locator('#row-A')).toHaveValue('');
    await expect(page.getByTestId('retained-track-draft')).toHaveCount(0);
    expect(worker.manual.tracks.B).toEqual(beforeB);
  } finally {
    await browser.close();
  }
});

test('Reality Gate: seven local fixture shapes fail closed without network, writes or manual status promotion', async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH ?? chromium.executablePath(),
    args: ['--no-sandbox'],
  });
  const page = await browser.newPage();
  const c = new Coordinator();
  await attachMockTransport(page, c);
  const external: string[] = [];
  page.on('request', (request) => {
    if (!request.url().startsWith('http://127.0.0.1:4173/'))
      external.push(request.url());
  });
  try {
    await page.goto('http://127.0.0.1:4173/fixture.html');
    const lab = page.getByRole('region', {
      name: 'Alleen-lezend fictief adapterlab',
    });
    for (const [scenario, reason] of [
      ['valid', 'READABLE_FICTION'],
      ['rerender', 'DOM_CHANGED'],
      ['canvas', 'CANVAS'],
      ['ambiguous', 'AMBIGUOUS'],
      ['mismatch', 'SCREENING_MISMATCH'],
      ['missing', 'MISSING_FIELDS'],
      ['server', 'SERVER_UNAVAILABLE'],
    ]) {
      await lab.getByLabel('Lokale bioscoopfixture').selectOption(scenario!);
      await expect(lab.getByTestId('readonly-result')).toHaveCount(0);
      await lab
        .getByRole('button', { name: 'Lees uitsluitend lokale fixture' })
        .click();
      await expect(lab.getByTestId('readonly-result')).toContainText(reason!);
      await expect(lab.getByTestId('readonly-result')).toContainText(
        'Status UNKNOWN',
      );
    }
    await page.clock.install();
    await lab.getByLabel('Lokale bioscoopfixture').selectOption('valid');
    await lab
      .getByRole('button', { name: 'Lees uitsluitend lokale fixture' })
      .click();
    await expect(lab.getByTestId('readonly-result')).toContainText(
      'READABLE_FICTION',
    );
    await page.clock.fastForward(31_000);
    await expect(lab.getByTestId('readonly-result')).toContainText('STALE');
    await lab
      .getByRole('button', { name: 'Lees uitsluitend lokale fixture' })
      .click();
    await page.locator('[data-field="time"]').evaluate((node) => {
      node.textContent = '20:00';
    });
    await page.clock.fastForward(1001);
    await expect(lab.getByTestId('readonly-result')).toContainText(
      'DOM_CHANGED',
    );
    expect(c.mode).toBe('MANUAL');
    expect(c.sessions.A.observation).toBeNull();
    expect(c.sessions.B.observation).toBeNull();
    expect(external).toEqual([]);
    await page.screenshot({
      path: 'test-results/reality-gate-fixture.png',
      fullPage: true,
    });
  } finally {
    await browser.close();
  }
});

test('Reality Gate: actual Chrome ISOLATED world reads only the exact localhost fixture, without MAIN globals or DOM writes', async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH ?? chromium.executablePath(),
    args: ['--no-sandbox'],
  });
  const page = await browser.newPage();
  try {
    await page.goto('http://127.0.0.1:4173/fixture.html');
    await page.evaluate(() =>
      Reflect.set(
        globalThis,
        'fictionalMainWorldSentinel',
        'must-not-cross-world',
      ),
    );
    const client = await page.context().newCDPSession(page);
    const tree = await client.send('Page.getFrameTree');
    const world = await client.send('Page.createIsolatedWorld', {
      frameId: tree.frameTree.frame.id,
      worldName: 'SeatBuddies local fixture-only test',
    });
    const result = await client.send('Runtime.evaluate', {
      contextId: world.executionContextId,
      awaitPromise: true,
      returnByValue: true,
      expression: `(async()=>{
        const m=await import('http://127.0.0.1:4173/fixture-reader.js');
        const r=m.createFixtureReader(document,{kind:'LOCAL_PREVIEW',world:'LOCAL_PREVIEW',permitted:true});
        const before=document.documentElement.outerHTML;
        const observed=r.read(100000);
        const o={observed,unchanged:before===document.documentElement.outerHTML,mainSentinel:typeof globalThis.fictionalMainWorldSentinel};
        r.dispose();return o;
      })()`,
    });
    expect(result.exceptionDetails).toBeUndefined();
    expect(result.result.value).toMatchObject({
      unchanged: true,
      mainSentinel: 'undefined',
      observed: {
        status: 'UNKNOWN',
        compatibility: 'READABLE_FICTION',
        provenance: { world: 'LOCAL_PREVIEW' },
        seatDisplay: {
          labels: ['F10', 'F11'],
          geometry: 'UNKNOWN',
          availability: 'UNKNOWN',
        },
      },
    });
    await client.detach();
  } finally {
    await browser.close();
  }
});

test('ZERO EXTRA: all fictional map exceptions, accessible route, keyboard/320px and zero remote requests', async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH ?? chromium.executablePath(),
    args: ['--no-sandbox'],
  });
  const page = await browser.newPage({ viewport: { width: 320, height: 900 } });
  const worker = new Coordinator();
  await attachMockTransport(page, worker);
  const external: string[] = [];
  page.on('request', (request) => {
    if (!request.url().startsWith('http://127.0.0.1:4173/'))
      external.push(request.url());
  });
  try {
    await page.goto('http://127.0.0.1:4173/fixture.html');
    await exerciseSeatPairLab(page);
    const size = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    }));
    expect(size.scroll).toBeLessThanOrEqual(size.client);
    expect(worker.mode).toBe('MANUAL');
    expect(external).toEqual([]);
    await page
      .getByLabel('Fictieve stoelkaart', { exact: true })
      .selectOption('mixed');
    await page
      .getByRole('button', {
        name: 'Zoek 2 stoelen zonder extra betaling (DEMO)',
        exact: true,
      })
      .click();
    await page
      .getByRole('region', { name: 'ZERO EXTRA · twee fictieve buurstoelen' })
      .screenshot({ path: 'test-results/zero-extra-pair.png' });
    await page.clock.install();
    await page.clock.fastForward(31_000);
    await expect(page.getByTestId('pair-candidate')).toHaveCount(0);
    await expect(page.getByTestId('pair-result')).toContainText('STALE_DATA');
    await page.screenshot({
      path: 'test-results/zero-extra-lab.png',
      fullPage: true,
    });
  } finally {
    await browser.close();
  }
});
test('ZERO EXTRA manual: optional categories, Ultra Lux review block, independent B changes and safe copy', async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH ?? chromium.executablePath(),
    args: ['--no-sandbox'],
  });
  const page = await browser.newPage({ viewport: { width: 320, height: 900 } });
  const worker = new Coordinator();
  const control: MockControl = { unavailable: false, worker };
  await attachMockTransport(page, worker, control);
  try {
    await page.goto('http://127.0.0.1:4173/sidepanel.html');
    await exerciseManualCategory(page);
    await openInputs(page, 'B');
    await page
      .getByLabel('Stoelcategorie B (optioneel)', { exact: true })
      .selectOption('LUX');
    await page.waitForTimeout(2100);
    await expect(
      page.getByLabel('Stoelcategorie B (optioneel)', { exact: true }),
    ).toHaveValue('LUX');
    await page
      .getByRole('button', { name: 'Bewaar eigen invoer B', exact: true })
      .click();
    await page
      .getByText('Diagnostiek zonder privégegevens', { exact: true })
      .click();
    await page.getByRole('button', { name: 'Voer zelfcontrole uit' }).click();
    await expect(page.getByTestId('diagnostic-report')).not.toContainText(
      'SAVER_LUX',
    );
    await expect(page.getByTestId('diagnostic-report')).not.toContainText(
      'ULTRA_LUX',
    );
    expect(worker.manual.tracks.A.completed).toEqual(['ACCOUNT']);
    await page
      .getByRole('region', { name: 'Filmavond-overzicht', exact: true })
      .screenshot({ path: 'test-results/zero-extra-hq.png' });
    await openInputs(page, 'A');
    await page
      .getByLabel('Stoelcategorie A (optioneel)', { exact: true })
      .selectOption('LUX');
    control.worker = new Coordinator();
    await expect(
      page.getByLabel('Stoelcategorie A (optioneel)', { exact: true }),
    ).toHaveValue('UNKNOWN');
    expect(control.worker.manual.tracks.A.category).toBe('UNKNOWN');
    await page.screenshot({
      path: 'test-results/zero-extra-manual.png',
      fullPage: true,
    });
  } finally {
    await browser.close();
  }
});

for (const failure of ['rejected', 'missing'] as const) {
  test(`first popup: ${failure} Side Panel API offers a normal-window fallback without claiming success`, async () => {
    const browser = await chromium.launch({
      executablePath: process.env.CHROMIUM_PATH ?? chromium.executablePath(),
      args: ['--no-sandbox'],
    });
    try {
      const page = await browser.newPage({
        viewport: { width: 320, height: 900 },
      });
      const worker = new Coordinator();
      const control: MockControl = {
        worker,
        unavailable: false,
        panelDenied: true,
        launches: [],
        normalWindows: [],
      };
      await attachMockTransport(page, worker, control);
      if (failure === 'missing')
        await page.addInitScript(() => {
          Reflect.deleteProperty(chrome, 'sidePanel');
        });
      await page.goto('http://127.0.0.1:4173/popup.html');
      await expect(
        page.getByText('Nog geen buddy’s.', { exact: false }),
      ).toBeVisible();
      const before = worker.snapshot(Date.now(), false);
      await page
        .getByRole('button', { name: 'Open boekingsassistent', exact: true })
        .focus();
      await page.keyboard.press('Enter');
      await expect(page.getByRole('alert')).toContainText(
        failure === 'missing' ? 'Chrome-zijpaneelmenu' : 'niet openen',
      );
      await expect(
        page.getByText('Chrome heeft het zijpaneel geopend.', { exact: false }),
      ).toHaveCount(0);
      const fallback = page.getByRole('button', {
        name: 'Open assistent in normaal venster',
        exact: true,
      });
      await expect(fallback).toBeEnabled();
      await fallback.focus();
      await page.keyboard.press('Enter');
      await expect
        .poll(() => control.normalWindows)
        .toEqual([
          {
            url: 'chrome-extension://fictional-extension/sidepanel.html',
            incognito: false,
            type: 'normal',
          },
        ]);
      expect(worker.snapshot(Date.now(), false)).toEqual(before);
      expect(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth <=
            document.documentElement.clientWidth,
        ),
      ).toBe(true);
    } finally {
      await browser.close();
    }
  });
}
