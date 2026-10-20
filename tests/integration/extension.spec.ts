import { chromium, expect, test } from '@playwright/test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { panelReplySchema } from '../../src/privacy/protocol';

// The real built MV3 package runs with system Chromium. No production sites are opened.
test('unpacked MV3: independent simulations, fixture provenance, fallback and navigation invalidation', async () => {
  const profile = await mkdtemp(join(tmpdir(), 'seatmates-browser-'));
  const extension = resolve('dist');
  const context = await chromium.launchPersistentContext(profile, {
    executablePath: process.env.CHROMIUM_PATH ?? chromium.executablePath(),
    ignoreDefaultArgs: ['--disable-extensions'],
    headless: process.env.HEADED !== '1',
    args: [`--load-extension=${extension}`, '--no-sandbox'],
  });
  try {
    const worker =
      context.serviceWorkers()[0] ??
      (await context.waitForEvent('serviceworker', { timeout: 10_000 }));
    const id = new URL(worker.url()).host;
    const page = await context.newPage();
    const failures: string[] = [];
    const external: string[] = [];
    page.on('pageerror', (error) => failures.push(error.message));
    context.on('request', (request) => {
      if (/^https?:/.test(request.url())) external.push(request.url());
    });
    await page.goto(`chrome-extension://${id}/sidepanel.html`);
    await page
      .getByRole('button', { name: 'Simulatie / technische proef' })
      .click();
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
    const width = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    }));
    expect(width.scroll).toBeLessThanOrEqual(width.client);
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
    const actual = panelReplySchema.parse(
      await page.evaluate(
        async () => await chrome.runtime.sendMessage({ type: 'GET_STATE' }),
      ),
    );
    if (!actual.ok) throw new Error(actual.error);
    if (!actual.state.sessions.A.binding)
      throw new Error('Fixture binding missing');
    expect(actual.state.sessions.A.binding).toMatchObject({ incognito: false });
    expect(actual.state.sessions.A.binding.tabId).toBeGreaterThanOrEqual(0);
    expect(actual.state.sessions.A.binding.windowId).toBeGreaterThanOrEqual(0);
    expect(actual.state.sessions.A.binding.documentId).toEqual(
      expect.any(String),
    );
    // A real sidePanel.open call from an explicit click must create its own browser target.
    const cdp = await context.newCDPSession(fixture);
    const before = (await cdp.send('Target.getTargets')).targetInfos.map(
      (t) => t.targetId,
    );
    await fixture.getByRole('button', { name: 'Open echt Side Panel' }).click();
    await expect
      .poll(async () =>
        (await cdp.send('Target.getTargets')).targetInfos.some(
          (t) =>
            t.url === `chrome-extension://${id}/sidepanel.html` &&
            !before.includes(t.targetId),
        ),
      )
      .toBe(true);
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
    await page
      .getByRole('button', { name: 'Simulatie / technische proef' })
      .click();
    await expect(
      firstChecklist.getByRole('checkbox').first(),
    ).not.toBeChecked();
    await page
      .getByRole('button', { name: 'Boekingsassistent', exact: true })
      .click();
    await expect(page.getByTestId('manual-status-A')).toHaveText(
      'Nog niet gecontroleerd',
    );
    expect(
      await worker.evaluate(
        () => chrome.runtime.getManifest().host_permissions ?? [],
      ),
    ).toEqual([]);
  } finally {
    await context.close();
    await rm(profile, { recursive: true, force: true });
  }
});

test('real Chrome context pairing with explicit incognito opt-in, revocation and worker suspension', async () => {
  test.setTimeout(60_000);
  const profile = await mkdtemp(join(tmpdir(), 'seatmates-incognito-'));
  const extension = resolve('dist');
  const context = await chromium.launchPersistentContext(profile, {
    executablePath: process.env.CHROMIUM_PATH ?? chromium.executablePath(),
    ignoreDefaultArgs: ['--disable-extensions'],
    headless: process.env.HEADED !== '1',
    args: [`--load-extension=${extension}`, '--no-sandbox'],
  });
  try {
    const worker =
      context.serviceWorkers()[0] ??
      (await context.waitForEvent('serviceworker', { timeout: 10_000 }));
    const id = new URL(worker.url()).host;
    let page = await context.newPage();
    await page.goto(`chrome-extension://${id}/sidepanel.html`);
    async function reopenPanel() {
      // Chrome unloads and re-registers the package after a permission change.
      // Wait for that read-only document readiness; no transaction is replayed.
      try {
        await expect(async () => {
          if (page.isClosed()) page = await context.newPage();
          await page.goto(`chrome-extension://${id}/sidepanel.html`);
          await expect(
            page.getByRole('heading', {
              name: 'Samen naar de film',
              exact: true,
            }),
          ).toBeVisible();
        }).toPass({ timeout: 10_000 });
      } catch (error) {
        // Only whitelisted status fields from this test's own Chrome settings UI.
        const status = await settings
          .locator('extensions-detail-view')
          .evaluate((element) => {
            const data: unknown = Reflect.get(element, 'data');
            if (!data || typeof data !== 'object') return null;
            return Object.fromEntries(
              [
                'id',
                'state',
                'incognitoAccess',
                'disableReasons',
                'location',
              ].map((key) => [key, Reflect.get(data, key)]),
            );
          });
        throw new Error(
          `Chrome package status after consent: ${JSON.stringify(status)}; workers: ${JSON.stringify(context.serviceWorkers().map((value) => value.url()))}`,
          { cause: error },
        );
      }
      expect(
        await page.evaluate(() => chrome.extension.inIncognitoContext),
      ).toBe(false);
    }
    const initial = panelReplySchema.parse(
      await page.evaluate(() =>
        chrome.runtime.sendMessage({ type: 'GET_STATE' }),
      ),
    );
    expect(initial.ok && initial.state.incognitoAllowed).toBe(false);
    // Test actor grants consent through Chrome's actual settings UI in its fresh profile.
    // No policy/profile-file mutation, hidden extension API or real account is used.
    const settings = await context.newPage();
    await settings.goto(`chrome://extensions/?id=${id}`);
    // Match the documented Windows unpacked-install workflow. Without this
    // regular UI setting Chrome rejects the package when consent reloads it.
    const developerMode = settings.locator('extensions-toolbar #devMode');
    await expect(developerMode).toBeVisible();
    if (
      !(await developerMode.evaluate((element) =>
        Boolean(Reflect.get(element, 'checked')),
      ))
    )
      await developerMode.click();
    await expect
      .poll(() =>
        developerMode.evaluate((element) =>
          Boolean(Reflect.get(element, 'checked')),
        ),
      )
      .toBe(true);
    const toggle = settings.locator(
      'extensions-detail-view #allow-incognito cr-toggle',
    );
    await expect(toggle).toBeVisible();
    await toggle.click();
    await reopenPanel();
    await expect
      .poll(async () => {
        const value = panelReplySchema.parse(
          await page.evaluate(() =>
            chrome.runtime.sendMessage({ type: 'GET_STATE' }),
          ),
        );
        return value.ok && value.state.incognitoAllowed;
      })
      .toBe(true);
    const incognitoWindowId = await page.evaluate(async () => {
      const created = await chrome.windows.create({
        incognito: true,
        url: 'about:blank',
      });
      if (!created || created.id === undefined)
        throw new Error('Test incognito window was not created');
      return created.id;
    });
    const snapshot = panelReplySchema.parse(
      await page.evaluate(() =>
        chrome.runtime.sendMessage({ type: 'GET_CONTEXTS' }),
      ),
    );
    if (!snapshot.ok) throw new Error(snapshot.error);
    const A = snapshot.state.contexts.find((value) => !value.incognito);
    const B = snapshot.state.contexts.find((value) => value.incognito);
    if (!A || !B)
      throw new Error('Normal/incognito active tab metadata missing');
    for (const [role, tabId] of [
      ['A', A.tabId],
      ['B', B.tabId],
    ] as const) {
      const result = panelReplySchema.parse(
        await page.evaluate(
          ({ role, tabId }) =>
            chrome.runtime.sendMessage({ type: 'BIND_CONTEXT', role, tabId }),
          { role, tabId },
        ),
      );
      expect(
        result.ok && result.state.manual.tracks[role].context,
      ).toMatchObject({ tabId, incognito: role === 'B' });
    }
    // Revoke the same explicit consent and verify B has no surviving binding.
    await settings.bringToFront();
    await toggle.click();
    // Some Chrome versions defer incognito permission changes until open incognito windows close.
    // Follow the actual settings warning; only close this test's own neutral window.
    if (await settings.locator('#allow-incognito-warning').isVisible()) {
      if (incognitoWindowId === undefined)
        throw new Error('Test incognito window ID missing');
      await page.evaluate(
        (windowId) => chrome.windows.remove(windowId),
        incognitoWindowId,
      );
    }
    await reopenPanel();
    await expect
      .poll(async () => {
        const value = panelReplySchema.parse(
          await page.evaluate(() =>
            chrome.runtime.sendMessage({ type: 'GET_STATE' }),
          ),
        );
        return (
          value.ok &&
          !value.state.incognitoAllowed &&
          value.state.manual.tracks.B.context === null
        );
      })
      .toBe(true);
    const planned = panelReplySchema.parse(
      await page.evaluate(() =>
        chrome.runtime.sendMessage({
          type: 'PLAN',
          plan: {
            movie: 'De maan van papier',
            cinema: 'Fictief Filmhuis',
            date: '2030-04-12',
            time: '19:30',
            hall: 'Zaal 2',
          },
        }),
      ),
    );
    if (!planned.ok) throw new Error(planned.error);
    expect(planned.state.manual.plan?.movie).toBe('De maan van papier');
    const cdp = await context.newCDPSession(page);
    let versionId: string | undefined;
    cdp.on('ServiceWorker.workerVersionUpdated', ({ versions }) => {
      const version = versions.find(
        (value) =>
          value.scriptURL === `chrome-extension://${id}/background.js` &&
          value.runningStatus === 'running',
      );
      if (version) versionId = version.versionId;
    });
    await cdp.send('ServiceWorker.enable');
    await expect.poll(() => versionId).toBeTruthy();
    await cdp.send('ServiceWorker.stopWorker', { versionId: versionId! });
    const restarted = panelReplySchema.parse(
      await page.evaluate(() =>
        chrome.runtime.sendMessage({ type: 'GET_STATE' }),
      ),
    );
    expect(restarted.ok && restarted.state.manual.plan).toBeNull();
    expect(restarted.ok && restarted.state.sessions.A.observation).toBeNull();
    expect(restarted.ok && restarted.state.sessions.B.observation).toBeNull();
  } finally {
    await context.close();
    await rm(profile, { recursive: true, force: true });
  }
});
