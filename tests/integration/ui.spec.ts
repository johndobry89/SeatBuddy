import { chromium, expect, test, type Page } from '@playwright/test';
import { Coordinator } from '../../src/background/coordinator';
import { routeMessage } from '../../src/background/message-router';

// A transport double only: the built Vue UI talks to the real router + coordinator in Node.
// This does not validate Chrome extension APIs, incognito or Side Panel placement.
async function attachMockTransport(page: Page, coordinator: Coordinator) {
  await page.exposeFunction('mockRuntimeSend', (raw: unknown) =>
    routeMessage(
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
    ),
  );
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
    await expect(checklist.getByRole('checkbox').first()).not.toBeChecked();
    expect(errors).toEqual([]);
  } finally {
    await browser.close();
  }
});

test('missing runtime preserves a usable independent manual checklist', async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH ?? chromium.executablePath(),
    args: ['--no-sandbox'],
  });
  try {
    const page = await browser.newPage();
    await page.goto('http://127.0.0.1:4173/sidepanel.html');
    await expect(page.getByRole('alert')).toContainText('Status UNKNOWN');
    await expect(page.getByTestId('status-A')).toHaveText('UNKNOWN');
    const a = page
      .getByRole('group', { name: 'Checklist persoon A' })
      .getByRole('checkbox')
      .first();
    const b = page
      .getByRole('group', { name: 'Checklist persoon B' })
      .getByRole('checkbox')
      .first();
    await a.check();
    await expect(b).not.toBeChecked();
    await expect(page.getByTestId('status-A')).toHaveText('UNKNOWN');
  } finally {
    await browser.close();
  }
});
