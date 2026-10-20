import { chromium, expect, test } from '@playwright/test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';

// The real built MV3 package runs with system Chromium. No production sites are opened.
test('unpacked MV3: independent simulations, fixture provenance, fallback and navigation invalidation', async () => {
  const profile = await mkdtemp(join(tmpdir(), 'seatmates-browser-'));
  const extension = resolve('dist');
  const context = await chromium.launchPersistentContext(profile, {
    executablePath: process.env.CHROMIUM_PATH ?? chromium.executablePath(),
    ignoreDefaultArgs: ['--disable-extensions'],
    headless: true,
    args: [
      `--disable-extensions-except=${extension}`,
      `--load-extension=${extension}`,
      '--no-sandbox',
    ],
  });
  try {
    const worker =
      context.serviceWorkers()[0] ??
      (await context.waitForEvent('serviceworker'));
    const id = new URL(worker.url()).host;
    const page = await context.newPage();
    const failures: string[] = [];
    const external: string[] = [];
    page.on('pageerror', (error) => failures.push(error.message));
    context.on('request', (request) => {
      if (/^https?:/.test(request.url())) external.push(request.url());
    });
    await page.goto(`chrome-extension://${id}/sidepanel.html`);
    await expect(page.getByTestId('status-A')).toHaveText('UNKNOWN');
    await expect(page.getByTestId('status-B')).toHaveText('UNKNOWN');
    await page.getByRole('button', { name: 'Start simulatie' }).click();
    await expect(page.getByTestId('match')).toHaveText('MATCH');
    await expect(page.getByTestId('adjacency')).toHaveText('MOCK_ADJACENT');
    await expect(page.getByTestId('status-A')).toHaveText('SELECTED');
    await page.getByLabel('Scenario', { exact: true }).selectOption('partial');
    await page.getByRole('button', { name: 'Start simulatie' }).click();
    await expect(page.getByTestId('status-A')).toHaveText('SIMULATED_COMPLETE');
    await expect(page.getByTestId('status-B')).toHaveText('FAILED');
    await expect(
      page.getByText('Partiële simulatie:', { exact: false }),
    ).toBeVisible();
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
    await page.getByRole('button', { name: 'Wis sessies / handmatig' }).click();
    const firstChecklist = page.getByRole('group', {
      name: 'Checklist persoon A',
    });
    await firstChecklist.getByRole('checkbox').first().check();
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
    const fixture = await context.newPage();
    fixture.on('pageerror', (error) => failures.push(error.message));
    await fixture.goto(`chrome-extension://${id}/fixture.html`);
    await fixture
      .getByRole('button', { name: 'Koppel deze fictieve tab' })
      .click();
    await expect(fixture.getByRole('status')).toContainText('Tab gekoppeld');
    await fixture
      .getByRole('button', { name: 'Verstuur fictieve waarneming' })
      .click();
    await expect(fixture.getByRole('status')).toContainText(
      'Fictieve waarneming verstuurd',
    );
    await expect(page.getByTestId('status-A')).toHaveText('SELECTED');
    await expect(page.getByTestId('status-B')).toHaveText('UNKNOWN');
    await fixture.getByLabel('Rol voor deze tab').selectOption('B');
    await fixture
      .getByRole('button', { name: 'Koppel deze fictieve tab' })
      .click();
    await expect(fixture.getByRole('status')).toContainText(
      'Bericht geweigerd',
    );
    await fixture.reload();
    await expect(page.getByTestId('status-A')).toHaveText('UNKNOWN');
    // Exercise the actual browser sidePanel configuration, beyond just the Vue page.
    expect(
      await worker.evaluate(async () => await chrome.sidePanel.getOptions({})),
    ).toMatchObject({ path: 'sidepanel.html', enabled: true });
    expect(
      await worker.evaluate(
        async () => await chrome.sidePanel.getPanelBehavior(),
      ),
    ).toMatchObject({ openPanelOnActionClick: true });
    expect(failures).toEqual([]);
    expect(external).toEqual([]);
    await page.reload();
    await expect(
      firstChecklist.getByRole('checkbox').first(),
    ).not.toBeChecked();
  } finally {
    await context.close();
    await rm(profile, { recursive: true, force: true });
  }
});
