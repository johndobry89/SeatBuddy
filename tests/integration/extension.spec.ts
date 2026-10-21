import { chromium, expect, test } from '@playwright/test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { panelReplySchema } from '../../src/privacy/protocol';
import { savedDraftSchema } from '../../src/core/retained-data';

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
      .getByText('Diagnostiek zonder privégegevens', { exact: true })
      .click();
    await page.getByRole('button', { name: 'Voer zelfcontrole uit' }).click();
    await expect(page.getByTestId('diagnostic-report')).toContainText(
      'SIDE_PANEL_AND_STORAGE',
    );
    await expect(page.getByTestId('diagnostic-report')).toContainText(
      '"extensionVersion": "0.5.0"',
    );
    await expect(page.getByTestId('diagnostic-report')).toContainText(
      'NOT_IMPLEMENTED',
    );
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
    ).toMatchObject({ openPanelOnActionClick: false });
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
          ({ role, tabId, generation, buddyEpoch }) =>
            chrome.runtime.sendMessage(
              role === 'B'
                ? {
                    type: 'B_COMMAND',
                    generation,
                    buddyEpoch,
                    command: { type: 'BIND_CONTEXT', role, tabId },
                  }
                : { type: 'BIND_CONTEXT', role, tabId },
            ),
          {
            role,
            tabId,
            generation: snapshot.state.generation,
            buddyEpoch: snapshot.state.buddyEpoch,
          },
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
    await page.reload();
    await expect(page.locator('#plan-movie')).toHaveValue('De maan van papier');
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
    expect(restarted.ok && restarted.state.generation).not.toBe(
      planned.state.generation,
    );
    await expect(
      page.getByText('Chrome-coördinator opnieuw gestart.', { exact: false }),
    ).toBeVisible();
    await expect(page.locator('#plan-movie')).toHaveValue('');
    await expect(page.getByTestId('manual-status-A')).toHaveText(
      'Nog niet gecontroleerd',
    );
  } finally {
    await context.close();
    await rm(profile, { recursive: true, force: true });
  }
});

test('real action popup shares one buddy with the panel and opens a native Side Panel through its button', async () => {
  // Pinned Playwright 1.64.1 otherwise detaches Chrome's native "other"
  // popup targets (coreBundle.js _onAttachedToTarget). This changes test
  // attachment only; no browser policy or shipped permission is modified.
  const previousAttachment = process.env.PW_CHROMIUM_ATTACH_TO_OTHER;
  process.env.PW_CHROMIUM_ATTACH_TO_OTHER = '1';
  const profile = await mkdtemp(join(tmpdir(), 'seatbuddies-popup-'));
  const context = await chromium.launchPersistentContext(profile, {
    executablePath: process.env.CHROMIUM_PATH ?? chromium.executablePath(),
    ignoreDefaultArgs: ['--disable-extensions'],
    headless: process.env.HEADED !== '1',
    args: [`--load-extension=${resolve('dist')}`, '--no-sandbox'],
  });
  context.setDefaultTimeout(7_000);
  try {
    const worker =
      context.serviceWorkers()[0] ??
      (await context.waitForEvent('serviceworker', { timeout: 10_000 }));
    const id = new URL(worker.url()).host;
    const neutral = context.pages()[0] ?? (await context.newPage());
    const cdp = await context.newCDPSession(neutral);
    const manifest = await worker.evaluate(() => chrome.runtime.getManifest());
    await worker.evaluate(() => {
      chrome.runtime.onMessage.addListener((raw: unknown, sender) => {
        if (
          typeof raw === 'object' &&
          raw &&
          'type' in raw &&
          raw.type === 'BUDDY_READ'
        )
          Reflect.set(globalThis, 's05PopupSender', {
            documentId: sender.documentId ?? null,
            frameId: sender.frameId ?? null,
            url: sender.url ?? null,
          });
      });
    });
    expect(manifest.action?.default_popup).toBe('popup.html');
    expect(manifest.permissions).toEqual(['sidePanel', 'storage']);
    for (const size of [16, 32, 48, 128])
      expect(manifest.icons?.[size]).toBe(`icons/icon-${size}.png`);
    const popupReady = context.waitForEvent('page', {
      predicate: (page) => page.url() === `chrome-extension://${id}/popup.html`,
      timeout: 10_000,
    });
    // Native action opening in this modern test browser, not a popup.html tab.
    // openPopup is test instrumentation (Chrome 127+); the shipped UI needs no such API.
    await worker.evaluate(() => chrome.action.openPopup());
    let popup;
    try {
      popup = await popupReady;
    } catch (error) {
      const targets = (await cdp.send('Target.getTargets')).targetInfos
        .filter((target) => target.url.startsWith(`chrome-extension://${id}/`))
        .map(({ targetId, type, url }) => ({ targetId, type, url }));
      throw new Error(
        `Own extension targets after native action: ${JSON.stringify(targets)}`,
        { cause: error },
      );
    }
    expect(
      (await cdp.send('Target.getTargets')).targetInfos.some(
        (target) => target.url === `chrome-extension://${id}/popup.html`,
      ),
    ).toBe(true);
    await expect(
      popup.getByRole('heading', { name: 'Met wie ga je naar de film?' }),
    ).toBeVisible();
    const metadata = await worker.evaluate(async () => ({
      contexts: (
        await chrome.runtime.getContexts({
          documentUrls: [chrome.runtime.getURL('popup.html')],
        })
      ).map(({ documentId, contextType, frameId, windowId, incognito }) => ({
        documentId,
        contextType,
        frameId,
        windowId,
        incognito,
      })),
      sender: Reflect.get(globalThis, 's05PopupSender'),
    }));
    await expect(
      popup.getByRole('button', {
        name: 'Probeer fictieve buddy’s Sanne en Mark',
      }),
      `Own isolated popup metadata: ${JSON.stringify(metadata)}`,
    ).toBeEnabled();
    await popup
      .getByRole('button', { name: 'Probeer fictieve buddy’s Sanne en Mark' })
      .click();
    await popup
      .getByRole('button', { name: 'Kies Sanne', exact: true })
      .click();
    await popup
      .getByRole('button', { name: 'Bevestig wijziging en wis B', exact: true })
      .click();
    await expect(popup.getByTestId('popup-selection')).toContainText(
      'Ik + Sanne',
    );
    expect(
      await popup.evaluate(() =>
        chrome.runtime.sendMessage({ type: 'GET_STATE' }),
      ),
    ).toMatchObject({ ok: false });
    const before = (await cdp.send('Target.getTargets')).targetInfos.map(
      (target) => target.targetId,
    );
    await popup
      .getByRole('button', { name: 'Open boekingsassistent', exact: true })
      .click();
    await expect
      .poll(async () =>
        (await cdp.send('Target.getTargets')).targetInfos.some(
          (target) =>
            target.url === `chrome-extension://${id}/sidepanel.html` &&
            !before.includes(target.targetId),
        ),
      )
      .toBe(true);
    const panel = await context.newPage();
    await panel.goto(`chrome-extension://${id}/sidepanel.html`);
    await expect(panel.getByTestId('panel-buddy')).toContainText('Ik + Sanne');
    const state = panelReplySchema.parse(
      await panel.evaluate(() =>
        chrome.runtime.sendMessage({ type: 'GET_STATE' }),
      ),
    );
    expect(state.ok && state.state.buddy.selectedId).toBeTruthy();
    expect(state.ok && state.state.manual.tracks.B.completed).toEqual([]);
    expect(state.ok && state.state.evidence.B.context).toBe('UNKNOWN');
    expect(
      await worker.evaluate(
        () => chrome.runtime.getManifest().host_permissions ?? [],
      ),
    ).toEqual([]);
  } finally {
    await context.close();
    await rm(profile, { recursive: true, force: true });
    if (previousAttachment === undefined)
      delete process.env.PW_CHROMIUM_ATTACH_TO_OTHER;
    else process.env.PW_CHROMIUM_ATTACH_TO_OTHER = previousAttachment;
  }
});

test('Chrome local/session storage: opt-in nickname survives a real worker stop, draft restores no proof, disabling deletes records', async () => {
  const profile = await mkdtemp(join(tmpdir(), 'seatbuddies-retention-'));
  const context = await chromium.launchPersistentContext(profile, {
    executablePath: process.env.CHROMIUM_PATH ?? chromium.executablePath(),
    ignoreDefaultArgs: ['--disable-extensions'],
    headless: process.env.HEADED !== '1',
    args: [`--load-extension=${resolve('dist')}`, '--no-sandbox'],
  });
  try {
    const worker =
      context.serviceWorkers()[0] ??
      (await context.waitForEvent('serviceworker', { timeout: 10_000 }));
    const id = new URL(worker.url()).host;
    const panel = await context.newPage();
    await panel.goto(`chrome-extension://${id}/sidepanel.html`);
    await panel.getByText('Buddy kiezen of beheren', { exact: true }).click();
    const remember = panel.getByRole('checkbox', {
      name: 'Onthoud mijn buddy-bijnamen op dit apparaat',
    });
    await expect(remember).toBeEnabled();
    await expect(remember).not.toBeChecked();
    await panel.getByLabel('Bijnaam toevoegen').fill('Filmmaatje');
    await panel
      .getByRole('button', { name: 'Voeg buddy toe', exact: true })
      .click();
    expect(await panel.evaluate(() => chrome.storage.local.get(null))).toEqual(
      {},
    );
    await remember.click();
    await expect(remember).toBeChecked();
    const saved = await panel.evaluate(() => chrome.storage.local.get(null));
    const rosterKey = 'seatbuddies.roster.v1';
    const draftKey = 'seatbuddies.draft.v1';
    expect(Object.keys(saved)).toEqual([rosterKey]);
    expect(saved[rosterKey]).toMatchObject({
      version: 1,
      roster: [{ nickname: 'Filmmaatje' }],
    });
    await panel
      .getByRole('button', { name: 'Kies Filmmaatje', exact: true })
      .click();
    await panel
      .getByRole('button', { name: 'Bevestig wijziging en wis B', exact: true })
      .click();
    await expect(panel.getByTestId('panel-selection')).toContainText(
      'Ik + Filmmaatje',
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
    await panel
      .getByRole('button', {
        name: 'Ik gebruik mijn eigen account en geldige pas — A',
        exact: true,
      })
      .click();
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
    const session = await panel.evaluate(() =>
      chrome.storage.session.get(null),
    );
    expect(Object.keys(session)).toEqual([draftKey]);
    const draftRecord = savedDraftSchema.parse(session[draftKey]);
    expect(Object.keys(draftRecord).sort()).toEqual([
      'createdAt',
      'plan',
      'version',
    ]);
    expect(Object.keys(draftRecord.plan).sort()).toEqual([
      'cinema',
      'date',
      'hall',
      'movie',
      'time',
    ]);
    const fixture = await context.newPage();
    await fixture.goto(`chrome-extension://${id}/fixture.html`);
    expect(
      await fixture.evaluate(() =>
        chrome.runtime.sendMessage({ type: 'GET_BUDDY' }),
      ),
    ).toEqual({ ok: true, buddy: null });
    expect(
      await fixture.evaluate(() =>
        chrome.runtime.sendMessage({
          type: 'REMEMBER_BUDDIES',
          enabled: false,
          generation: crypto.randomUUID(),
          revision: 0,
        }),
      ),
    ).toMatchObject({ ok: false });
    const before = panelReplySchema.parse(
      await panel.evaluate(() =>
        chrome.runtime.sendMessage({ type: 'GET_STATE' }),
      ),
    );
    if (!before.ok) throw new Error(before.error);
    const cdp = await context.newCDPSession(panel);
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
    const after = panelReplySchema.parse(
      await panel.evaluate(() =>
        chrome.runtime.sendMessage({ type: 'GET_STATE' }),
      ),
    );
    if (!after.ok) throw new Error(after.error);
    expect(after.state.generation).not.toBe(before.state.generation);
    expect(after.state.buddy.roster[0]?.nickname).toBe('Filmmaatje');
    expect(after.state.buddy.selectedId).toBeNull();
    expect(after.state.manual.plan).toBeNull();
    for (const role of ['A', 'B'] as const) {
      expect(after.state.manual.tracks[role].completed).toEqual([]);
      expect(after.state.manual.tracks[role].context).toBeNull();
      expect(after.state.manual.tracks[role].seat).toEqual({
        row: '',
        number: '',
      });
      expect(after.state.sessions[role].observation).toBeNull();
    }
    await expect(panel.locator('#plan-movie')).toHaveValue('');
    await panel
      .getByRole('button', { name: 'Herstel concept', exact: true })
      .click();
    await expect(panel.locator('#plan-movie')).toHaveValue(
      'De maan van papier',
    );
    await expect(panel.getByTestId('hq-next')).toHaveAttribute(
      'data-step',
      'PLAN',
    );
    await expect(panel.getByTestId('hq-A')).toContainText('0/5');
    await remember.click();
    await expect(remember).not.toBeChecked();
    expect(await panel.evaluate(() => chrome.storage.local.get(null))).toEqual(
      {},
    );
    expect(
      await panel.evaluate(() => chrome.storage.session.get(null)),
    ).toEqual({});
    // A reload of an ordinary popup document reads the same worker and never re-enables consent.
    const popup = await context.newPage();
    await popup.goto(`chrome-extension://${id}/popup.html`);
    await expect(
      popup.getByRole('checkbox', {
        name: 'Onthoud mijn buddy-bijnamen op dit apparaat',
      }),
    ).not.toBeChecked();
    await popup.reload();
    await expect(
      popup.getByRole('checkbox', {
        name: 'Onthoud mijn buddy-bijnamen op dit apparaat',
      }),
    ).not.toBeChecked();
  } finally {
    await context.close();
    await rm(profile, { recursive: true, force: true });
  }
});

test('spanning Chrome: a real incognito popup cannot read remembered names, change consent or save a draft', async () => {
  test.setTimeout(60_000);
  const previous = process.env.PW_CHROMIUM_ATTACH_TO_OTHER;
  process.env.PW_CHROMIUM_ATTACH_TO_OTHER = '1';
  const profile = await mkdtemp(join(tmpdir(), 'seatbuddies-private-popup-'));
  const context = await chromium.launchPersistentContext(profile, {
    executablePath: process.env.CHROMIUM_PATH ?? chromium.executablePath(),
    ignoreDefaultArgs: ['--disable-extensions'],
    headless: process.env.HEADED !== '1',
    args: [`--load-extension=${resolve('dist')}`, '--no-sandbox'],
  });
  try {
    const worker =
      context.serviceWorkers()[0] ??
      (await context.waitForEvent('serviceworker', { timeout: 10_000 }));
    const id = new URL(worker.url()).host;
    const settings = await context.newPage();
    await settings.goto(`chrome://extensions/?id=${id}`);
    const developer = settings.locator('extensions-toolbar #devMode');
    await expect(developer).toBeVisible();
    if (
      !(await developer.evaluate((element) =>
        Boolean(Reflect.get(element, 'checked')),
      ))
    )
      await developer.click();
    const toggle = settings.locator(
      'extensions-detail-view #allow-incognito cr-toggle',
    );
    await expect(toggle).toBeVisible();
    await toggle.click();
    const panel = await context.newPage();
    await expect(async () => {
      await panel.goto(`chrome-extension://${id}/sidepanel.html`);
      await expect(
        panel.getByRole('heading', { name: 'Samen naar de film', exact: true }),
      ).toBeVisible();
      const state = panelReplySchema.parse(
        await panel.evaluate(() =>
          chrome.runtime.sendMessage({ type: 'GET_STATE' }),
        ),
      );
      expect(state.ok && state.state.incognitoAllowed).toBe(true);
    }).toPass({ timeout: 10_000 });
    await panel.getByText('Buddy kiezen of beheren', { exact: true }).click();
    await panel.getByLabel('Bijnaam toevoegen').fill('Filmmaatje');
    await panel
      .getByRole('button', { name: 'Voeg buddy toe', exact: true })
      .click();
    await panel
      .getByRole('checkbox', {
        name: 'Onthoud mijn buddy-bijnamen op dit apparaat',
      })
      .click();
    await expect(panel.getByTestId('retention-status')).toContainText(
      'niet standaard versleuteld',
    );
    const before = await panel.evaluate(() => chrome.storage.local.get(null));
    const normal = panelReplySchema.parse(
      await panel.evaluate(() =>
        chrome.runtime.sendMessage({ type: 'GET_STATE' }),
      ),
    );
    if (!normal.ok) throw new Error(normal.error);
    const windowId = await panel.evaluate(
      async () =>
        (await chrome.windows.create({ incognito: true, url: 'about:blank' }))
          ?.id,
    );
    if (windowId === undefined)
      throw new Error('Isolated incognito window missing');
    const popupReady = context.waitForEvent('page', {
      predicate: (page) => page.url() === `chrome-extension://${id}/popup.html`,
    });
    await panel.evaluate(
      (windowId) => chrome.action.openPopup({ windowId }),
      windowId,
    );
    const popup = await popupReady;
    await expect(popup.getByRole('alert')).toContainText('normaal venster');
    await expect(
      popup.getByRole('checkbox', {
        name: 'Onthoud mijn buddy-bijnamen op dit apparaat',
      }),
    ).toBeDisabled();
    const gate = {
      generation: normal.state.generation,
      revision: normal.state.buddy.revision,
    };
    for (const command of [
      { type: 'BUDDY_READ' },
      { type: 'REMEMBER_BUDDIES', ...gate, enabled: false },
      {
        type: 'DRAFT_SAVE',
        ...gate,
        plan: {
          movie: 'Fictieve privéfilm',
          cinema: 'Fictief Filmhuis',
          date: '2030-04-12',
          time: '19:30',
          hall: 'Zaal 2',
        },
      },
    ]) {
      const response: unknown = await popup.evaluate(
        (command) => chrome.runtime.sendMessage(command),
        command,
      );
      if (command.type === 'DRAFT_SAVE')
        expect(response).toEqual({
          ok: false,
          error:
            'Bericht geweigerd. Koppel en observeer de fictieve tab opnieuw.',
        });
      else
        expect(response).toMatchObject({
          ok: false,
          code: 'BROWSER_UNAVAILABLE',
        });
      expect(JSON.stringify(response)).not.toContain('Filmmaatje');
    }
    expect(await panel.evaluate(() => chrome.storage.local.get(null))).toEqual(
      before,
    );
    expect(
      await panel.evaluate(() => chrome.storage.session.get(null)),
    ).toEqual({});
    await panel.evaluate(
      (windowId) => chrome.windows.remove(windowId),
      windowId,
    );
  } finally {
    await context.close();
    await rm(profile, { recursive: true, force: true });
    if (previous === undefined) delete process.env.PW_CHROMIUM_ATTACH_TO_OTHER;
    else process.env.PW_CHROMIUM_ATTACH_TO_OTHER = previous;
  }
});
