import { chromium, expect, test, type Page } from '@playwright/test';
import { Coordinator } from '../../src/background/coordinator';
import { routeMessage } from '../../src/background/message-router';

// A transport double only: the built Vue UI talks to the real router + coordinator in Node.
// This does not validate Chrome extension APIs, incognito or Side Panel placement.
async function attachMockTransport(page: Page, coordinator: Coordinator) {
  let reads = 0;
  await page.exposeFunction('mockRuntimeSend', (raw: unknown) => {
    if (
      typeof raw === 'object' &&
      raw !== null &&
      'type' in raw &&
      raw.type === 'GET_STATE'
    )
      reads++;
    return routeMessage(
      coordinator,
      raw,
      {
        id: 'fictional-extension',
        url: 'chrome-extension://fictional-extension/sidepanel.html',
        frameId: 0,
      },
      'fictional-extension',
      false,
      Date.now(),
    );
  });
  await page.addInitScript(() => {
    Object.defineProperty(globalThis, 'chrome', {
      value: {
        runtime: {
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
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(320);
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
    await expect(
      page.getByText('Zaal UNKNOWN.', { exact: false }),
    ).toBeVisible();
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
    const card = page.getByRole('article', { name: 'Account B' });
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
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(320);
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
