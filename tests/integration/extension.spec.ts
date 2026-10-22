import {
  exerciseSeatPairLab,
  exerciseManualCategory,
} from '../helpers/zero-extra-workflow';
import { unpackPackagedExtension } from '../helpers/packaged-extension';
import { openSimulation } from '../helpers/browser-workflow';
import {
  firstPlanViaUI,
  enterSeats,
  reviewViaUI,
  planViaUI,
} from '../helpers/browser-workflow';
import type { Page } from '@playwright/test';
import type { ManualCommand } from '../../src/core/manual-assistant';
import { chromium, expect, test } from '@playwright/test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  panelReplySchema,
  fixtureLeaseReplySchema,
} from '../../src/privacy/protocol';
import { savedDraftSchema } from '../../src/core/retained-data';

let packaged: Awaited<ReturnType<typeof unpackPackagedExtension>>;
test.beforeAll(async () => {
  packaged = await unpackPackagedExtension();
  console.log(
    `PACKAGED_EXTENSION ${packaged.version} SHA256 ${packaged.sha256}`,
  );
});
test.afterAll(async () => {
  await packaged?.cleanup();
});

// The real built MV3 package runs with system Chromium. No production sites are opened.
async function sendWorkflow(page: Page, command: ManualCommand) {
  const state = panelReplySchema.parse(
    await page.evaluate(() =>
      chrome.runtime.sendMessage({ type: 'GET_STATE' }),
    ),
  );
  if (!state.ok) throw new Error(state.error);
  return page.evaluate((message) => chrome.runtime.sendMessage(message), {
    type: 'WORKFLOW',
    generation: state.state.generation,
    revision: state.state.manual.revision,
    buddyEpoch: state.state.buddyEpoch,
    command,
  });
}

test(
  'unpacked MV3: independent simulations, fixture provenance, fallback and navigation invalidation',
  { tag: '@smoke' },
  async () => {
    const profile = await mkdtemp(join(tmpdir(), 'seatmates-browser-'));
    const extension = packaged.directory;
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
        '"extensionVersion": "0.10.0"',
      );
      await expect(page.getByTestId('diagnostic-report')).toContainText(
        'NOT_IMPLEMENTED',
      );
      await openSimulation(page);
      await expect(page.getByTestId('status-A')).toHaveText('UNKNOWN');
      await expect(page.getByTestId('status-B')).toHaveText('UNKNOWN');
      await page.getByRole('button', { name: 'Start simulatie' }).click();
      await expect(page.getByTestId('match')).toHaveText('MATCH');
      await expect(page.getByTestId('adjacency')).toHaveText('MOCK_ADJACENT');
      await expect(page.getByTestId('status-A')).toHaveText('SELECTED');
      await page
        .getByLabel('Scenario', { exact: true })
        .selectOption('partial');
      await page.getByRole('button', { name: 'Start simulatie' }).click();
      await expect(page.getByTestId('status-A')).toHaveText(
        'SIMULATED_COMPLETE',
      );
      await expect(page.getByTestId('status-B')).toHaveText('FAILED');
      await expect(
        page.getByText('Partiële simulatie:', { exact: false }),
      ).toBeVisible();
      await page
        .getByLabel('Scenario', { exact: true })
        .selectOption('mismatch');
      await page.getByRole('button', { name: 'Start simulatie' }).click();
      await expect(page.getByTestId('match')).toHaveText('MISMATCH');
      await page.getByLabel('Scenario', { exact: true }).selectOption('aisle');
      await page.getByRole('button', { name: 'Start simulatie' }).click();
      await expect(page.getByTestId('adjacency')).toHaveText('NOT_ADJACENT');
      await page.getByLabel('Scenario', { exact: true }).selectOption('stale');
      await page.getByRole('button', { name: 'Start simulatie' }).click();
      await expect(page.getByTestId('status-A')).toHaveText('SELECTED');
      await expect(page.getByTestId('status-B')).toHaveText('UNKNOWN');
      await page
        .getByRole('button', { name: 'Wis sessies / handmatig' })
        .click();
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
      expect(actual.state.sessions.A.binding).toMatchObject({
        incognito: false,
      });
      expect(actual.state.sessions.A.binding.tabId).toBeGreaterThanOrEqual(0);
      expect(actual.state.sessions.A.binding.windowId).toBeGreaterThanOrEqual(
        0,
      );
      expect(actual.state.sessions.A.binding.documentId).toEqual(
        expect.any(String),
      );
      // A real sidePanel.open call from an explicit click must create its own browser target.
      const cdp = await context.newCDPSession(fixture);
      const before = (await cdp.send('Target.getTargets')).targetInfos.map(
        (t) => t.targetId,
      );
      await fixture
        .getByRole('button', { name: 'Open echt Side Panel' })
        .click();
      await expect
        .poll(async () =>
          (await cdp.send('Target.getTargets')).targetInfos.some(
            (t) =>
              t.url.split(/[?#]/)[0] ===
                `chrome-extension://${id}/sidepanel.html` &&
              !before.includes(t.targetId),
          ),
        )
        .toBe(true);
      await fixture.getByLabel('Rol voor deze tab').selectOption('B');
      await fixture
        .getByRole('button', { name: 'Koppel deze fictieve tab' })
        .click();
      await expect(fixture.getByRole('status')).toContainText('Status UNKNOWN');
      await expect(fixture.getByRole('status')).toContainText(
        'Handmatig verder',
      );
      const refusedB = panelReplySchema.parse(
        await page.evaluate(() =>
          chrome.runtime.sendMessage({ type: 'GET_STATE' }),
        ),
      );
      expect(refusedB.ok && refusedB.state.sessions.B.binding).toBeNull();
      expect(refusedB.ok && refusedB.state.sessions.B.observation).toBeNull();
      expect(refusedB.ok && refusedB.state.sessions.A.binding?.incognito).toBe(
        false,
      );
      await fixture.reload();
      await expect(page.getByTestId('status-A')).toHaveText('UNKNOWN');
      // Exercise the actual browser sidePanel configuration, beyond just the Vue page.
      expect(
        await worker.evaluate(
          async () => await chrome.sidePanel.getOptions({}),
        ),
      ).toMatchObject({ path: 'sidepanel.html', enabled: true });
      expect(
        await worker.evaluate(
          async () => await chrome.sidePanel.getPanelBehavior(),
        ),
      ).toMatchObject({ openPanelOnActionClick: false });
      expect(failures).toEqual([]);
      expect(external).toEqual([]);
      await page.reload();
      await openSimulation(page);
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
  },
);

test('real Chrome context pairing with explicit incognito opt-in, revocation and worker suspension', async () => {
  test.setTimeout(60_000);
  const profile = await mkdtemp(join(tmpdir(), 'seatmates-incognito-'));
  const extension = packaged.directory;
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
    expect(
      await sendWorkflow(page, {
        type: 'PLANNING_MODE',
        mode: 'TOGETHER',
        resetB: false,
      }),
    ).toMatchObject({ ok: true });
    for (const [role, tabId] of [
      ['A', A.tabId],
      ['B', B.tabId],
    ] as const) {
      const result = panelReplySchema.parse(
        await sendWorkflow(page, { type: 'BIND_CONTEXT', role, tabId }),
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
      await sendWorkflow(page, {
        type: 'PLAN',
        plan: {
          movie: 'De maan van papier',
          cinema: 'Fictief Filmhuis',
          date: '2030-04-12',
          time: '19:30',
          hall: 'Zaal 2',
        },
      }),
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
    await expect(page.getByTestId('lifecycle-notice')).toBeVisible();
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
    args: [`--load-extension=${packaged.directory}`, '--no-sandbox'],
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
      predicate: (page) =>
        page.url().split(/[?#]/)[0] === `chrome-extension://${id}/popup.html`,
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
        (target) =>
          target.url.split(/[?#]/)[0] === `chrome-extension://${id}/popup.html`,
      ),
    ).toBe(true);
    await expect(
      popup.getByRole('heading', { name: 'Met wie ga je naar de film?' }),
    ).toBeVisible();
    const metadata = await worker.evaluate(async () => ({
      contexts: (
        await chrome.runtime.getContexts({
          contextTypes: ['POPUP'],
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
            target.url.split(/[?#]/)[0] ===
              `chrome-extension://${id}/sidepanel.html` &&
            !before.includes(target.targetId),
        ),
      )
      .toBe(true);
    await expect
      .poll(() =>
        context
          .pages()
          .some(
            (page) =>
              page.url().split(/[?#]/)[0] ===
              `chrome-extension://${id}/sidepanel.html`,
          ),
      )
      .toBe(true);
    const panel = context
      .pages()
      .find(
        (page) =>
          page.url().split(/[?#]/)[0] ===
          `chrome-extension://${id}/sidepanel.html`,
      )!;
    await expect(panel.getByTestId('panel-buddy')).toContainText(
      'Ik ga alleen',
    );
    await expect(panel.getByTestId('inactive-B')).toBeVisible();
    await panel
      .getByRole('button', { name: 'Ook met buddy plannen', exact: true })
      .focus();
    await panel.keyboard.press('Enter');
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
    args: [`--load-extension=${packaged.directory}`, '--no-sandbox'],
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
    expect(after.state.manual.planningMode).toBe('SOLO');
    expect(after.state.manual.review).toBeNull();
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
    args: [`--load-extension=${packaged.directory}`, '--no-sandbox'],
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
      predicate: (page) =>
        page.url().split(/[?#]/)[0] === `chrome-extension://${id}/popup.html`,
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
    const recoveredPage = context.waitForEvent('page', {
      predicate: (page) =>
        page.url().split(/[?#]/)[0] ===
        `chrome-extension://${id}/sidepanel.html`,
    });
    await popup
      .getByRole('button', {
        name: 'Open assistent in normaal venster',
        exact: true,
      })
      .click();
    const recovered = await recoveredPage;
    await expect(
      recovered.getByRole('heading', {
        name: 'Filmavond-overzicht',
        exact: true,
      }),
    ).toBeVisible();
    const recoveredState = panelReplySchema.parse(
      await recovered.evaluate(() =>
        chrome.runtime.sendMessage({ type: 'GET_STATE' }),
      ),
    );
    expect(
      recoveredState.ok && recoveredState.state.buddy.roster[0]?.nickname,
    ).toBe('Filmmaatje');
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

test('real Chrome Projector Ready: solo intent, two-panel preflight races, partial rescue and local-only diagnostics', async () => {
  const profile = await mkdtemp(join(tmpdir(), 'seatbuddies-projector-'));
  const context = await chromium.launchPersistentContext(profile, {
    executablePath: process.env.CHROMIUM_PATH ?? chromium.executablePath(),
    ignoreDefaultArgs: ['--disable-extensions'],
    headless: process.env.HEADED !== '1',
    args: [`--load-extension=${packaged.directory}`, '--no-sandbox'],
  });
  try {
    const worker =
      context.serviceWorkers()[0] ??
      (await context.waitForEvent('serviceworker', { timeout: 10_000 }));
    const id = new URL(worker.url()).host;
    const panel = await context.newPage();
    const requests: string[] = [];
    context.on('request', (request) => {
      if (/^https?:/.test(request.url())) requests.push(request.url());
    });
    await panel.goto(`chrome-extension://${id}/sidepanel.html`);
    await expect(panel.getByTestId('inactive-B')).toBeVisible();
    await planViaUI(panel, true);
    await enterSeats(panel, ['A', 'B']);
    await reviewViaUI(panel);
    for (let step = 0; step < 5; step++)
      await panel.locator('#next-own-A').click();
    await expect(panel.getByTestId('hq-status-A')).toContainText(
      'Zelf gemeld afgerond',
    );
    const before = panelReplySchema.parse(
      await panel.evaluate(() =>
        chrome.runtime.sendMessage({ type: 'GET_STATE' }),
      ),
    );
    if (!before.ok) throw new Error(before.error);
    const stale = {
      type: 'WORKFLOW',
      generation: before.state.generation,
      revision: before.state.manual.revision,
      buddyEpoch: before.state.buddyEpoch,
      command: { type: 'ACKNOWLEDGE', role: 'B', step: 'ACCOUNT' },
    };
    const peer = await context.newPage();
    await peer.goto(`chrome-extension://${id}/sidepanel.html`);
    const original = before.state.manual.plan!;
    expect(
      await sendWorkflow(peer, {
        type: 'MANUAL_DETAILS',
        role: 'B',
        showtime: { ...original, time: '21:00' },
        seat: { row: 'F', number: '11' },
      }),
    ).toMatchObject({ ok: true });
    expect(
      await panel.evaluate(
        (message) => chrome.runtime.sendMessage(message),
        stale,
      ),
    ).toMatchObject({ ok: false, code: 'STALE_WORKFLOW' });
    await expect(panel.getByTestId('hq-next')).toHaveAttribute(
      'data-step',
      'MISMATCH',
    );
    await expect(panel.getByTestId('hq-A')).toContainText('5/5');
    await panel
      .getByText('Eerste reservering controleren', { exact: true })
      .click();
    await expect(
      panel.getByText('Open zelf het account van A', { exact: false }),
    ).toBeVisible();
    await panel
      .getByText('Tweede account opnieuw nalopen', { exact: true })
      .click();
    await expect(
      panel.getByText('Bekijk eerst de actuele uitkomst in B’s eigen account', {
        exact: false,
      }),
    ).toBeVisible();
    expect(
      await sendWorkflow(peer, {
        type: 'MANUAL_DETAILS',
        role: 'B',
        showtime: original,
        seat: { row: 'F', number: '11' },
      }),
    ).toMatchObject({ ok: true });
    await reviewViaUI(peer);
    for (let step = 0; step < 5; step++)
      await peer.locator('#next-own-B').click();
    await expect(peer.getByTestId('hq-next')).toContainText(
      'Beide zelf gemeld; echte bevestiging op Vue niet geverifieerd',
    );
    await peer
      .getByText('Diagnostiek zonder privégegevens', { exact: true })
      .click();
    await peer
      .getByRole('button', { name: 'Voer zelfcontrole uit', exact: true })
      .click();
    const report = peer.getByTestId('diagnostic-report');
    await expect(report).toBeFocused();
    const text = await report.innerText();
    expect(JSON.parse(text)).toMatchObject({
      extensionVersion: '0.10.0',
      productionAdapter: 'DISABLED_G0',
      permissionScope: 'SIDE_PANEL_AND_STORAGE',
    });
    expect(text).not.toContain(original.movie!);
    expect(text).not.toContain(id);
    await peer
      .getByRole('button', { name: 'Kopieer technische diagnose', exact: true })
      .focus();
    await peer.keyboard.press('Enter');
    await expect(
      peer.getByText('Technische diagnose gekopieerd.', { exact: false }),
    ).toBeVisible();
    expect(requests).toEqual([]);
  } finally {
    await context.close();
    await rm(profile, { recursive: true, force: true });
  }
});

test(
  'First-Run Forge native local self-test cannot mutate current Chrome storage, selected buddy, plan, manual proof or incognito consent',
  { tag: '@smoke' },
  async () => {
    const profile = await mkdtemp(join(tmpdir(), 'seatbuddies-first-run-'));
    const context = await chromium.launchPersistentContext(profile, {
      executablePath: process.env.CHROMIUM_PATH ?? chromium.executablePath(),
      ignoreDefaultArgs: ['--disable-extensions'],
      headless: process.env.HEADED !== '1',
      args: [`--load-extension=${packaged.directory}`, '--no-sandbox'],
    });
    try {
      const worker =
        context.serviceWorkers()[0] ??
        (await context.waitForEvent('serviceworker', { timeout: 10_000 }));
      const id = new URL(worker.url()).host;
      const panel = await context.newPage();
      const external: string[] = [];
      context.on('request', (request) => {
        if (/^https?:/.test(request.url())) external.push(request.url());
      });
      await panel.goto(`chrome-extension://${id}/sidepanel.html`);
      await expect(
        panel.getByRole('link', {
          name: 'Start met een fictieve proef ↗',
          exact: true,
        }),
      ).toHaveAttribute('href', './fixture.html');
      await panel.getByText('Buddy kiezen of beheren', { exact: true }).click();
      await panel
        .getByLabel('Bijnaam toevoegen', { exact: true })
        .fill('Fictief maatje');
      await panel
        .getByRole('button', { name: 'Voeg buddy toe', exact: true })
        .click();
      const remember = panel.getByRole('checkbox', {
        name: 'Onthoud mijn buddy-bijnamen op dit apparaat',
        exact: true,
      });
      // Consent is controlled by the asynchronously acknowledged storage result.
      await expect(remember).not.toBeChecked();
      await remember.click();
      await expect(remember).toBeChecked();
      await panel
        .getByRole('button', { name: 'Kies Fictief maatje', exact: true })
        .click();
      await panel
        .getByRole('button', {
          name: 'Bevestig wijziging en wis B',
          exact: true,
        })
        .click();
      await firstPlanViaUI(panel, true);
      await reviewViaUI(panel);
      await panel.locator('#next-own-A').click();
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
      const inspect = () =>
        panel.evaluate(async () => ({
          state: await chrome.runtime.sendMessage({ type: 'GET_STATE' }),
          local: await chrome.storage.local.get(null),
          session: await chrome.storage.session.get(null),
          allowed: await chrome.extension.isAllowedIncognitoAccess(),
        }));
      const before = await inspect();
      await panel
        .getByText('Diagnostiek zonder privégegevens', { exact: true })
        .click();
      for (let i = 0; i < 2; i++) {
        await panel
          .getByRole('button', { name: 'Controleer SeatBuddies', exact: true })
          .click();
        await expect(panel.getByTestId('local-test-result')).toHaveText(
          'Lokale proef geslaagd',
        );
        expect(await inspect()).toEqual(before);
      }
      const text = await panel.getByTestId('local-test-report').innerText();
      expect(JSON.parse(text)).toMatchObject({
        kind: 'FICTIONAL_TEST',
        extensionVersion: '0.10.0',
        adapterVersion: 'FICTIONAL_V1',
      });
      for (const secret of [
        'Fictief maatje',
        'De maan van papier',
        '2030-04-12',
        'F10',
        id,
      ])
        expect(text).not.toContain(secret);
      await panel
        .getByRole('button', {
          name: 'Kopieer lokale testsamenvatting',
          exact: true,
        })
        .click();
      await expect(
        panel.getByText('Technische diagnose gekopieerd.', { exact: false }),
      ).toBeVisible();
      expect(await inspect()).toEqual(before);
      expect(external).toEqual([]);
    } finally {
      await context.close();
      await rm(profile, { recursive: true, force: true });
    }
  },
);

test(
  'Reality Gate: packaged ZIP read-only parser in an actual ISOLATED world on invented cinema DOM',
  { tag: '@smoke' },
  async () => {
    const profile = await mkdtemp(join(tmpdir(), 'seatbuddies-reader-'));
    const context = await chromium.launchPersistentContext(profile, {
      executablePath: process.env.CHROMIUM_PATH ?? chromium.executablePath(),
      ignoreDefaultArgs: ['--disable-extensions'],
      headless: process.env.HEADED !== '1',
      args: [`--load-extension=${packaged.directory}`, '--no-sandbox'],
    });
    try {
      const worker =
        context.serviceWorkers()[0] ??
        (await context.waitForEvent('serviceworker', { timeout: 10_000 }));
      const id = new URL(worker.url()).host;
      const page = await context.newPage();
      const external: string[] = [];
      context.on('request', (request) => {
        if (/^https?:/.test(request.url())) external.push(request.url());
      });
      await page.goto(`chrome-extension://${id}/fixture.html`);
      await page.bringToFront();
      const manifest = await worker.evaluate(() =>
        chrome.runtime.getManifest(),
      );
      expect(manifest.permissions).toEqual(['sidePanel', 'storage']);
      expect(manifest.host_permissions ?? []).toEqual([]);
      expect(manifest.content_scripts ?? []).toEqual([]);
      const beforeStorage = await worker.evaluate(async () => ({
        local: await chrome.storage.local.get(null),
        session: await chrome.storage.session.get(null),
      }));
      await page.evaluate(() =>
        Reflect.set(
          globalThis,
          'fictionalMainWorldSentinel',
          'must-not-cross-world',
        ),
      );
      const client = await context.newCDPSession(page);
      await client.send('Page.enable');
      const tree = await client.send('Page.getFrameTree');
      const { executionContextId } = await client.send(
        'Page.createIsolatedWorld',
        {
          frameId: tree.frameTree.frame.id,
          worldName: 'SeatBuddies fictional read-only test',
        },
      );
      const evaluate = async (expression: string) => {
        const result = await client.send('Runtime.evaluate', {
          expression,
          contextId: executionContextId,
          awaitPromise: true,
          returnByValue: true,
        });
        expect(result.exceptionDetails).toBeUndefined();
        return result.result.value as {
          compatibility: string;
          status: string;
          screening: unknown;
          sentinel: unknown;
          unchanged: boolean;
        };
      };
      const readExpression = `(async()=>{const m=await import('chrome-extension://${id}/fixture-reader.js');
      globalThis.sbFixtureReader?.dispose();
      globalThis.sbFixtureReader=m.createFixtureReader(document,{kind:'PACKAGED',extensionId:'${id}',world:'ISOLATED',permitted:true});
      const before=document.documentElement.outerHTML;
      const o=globalThis.sbFixtureReader.read(100000);
      return {...o,sentinel:typeof globalThis.fictionalMainWorldSentinel,unchanged:before===document.documentElement.outerHTML};})()`;
      for (const [scenario, reason] of [
        ['valid', 'READABLE_FICTION'],
        ['rerender', 'DOM_CHANGED'],
        ['canvas', 'CANVAS'],
        ['ambiguous', 'AMBIGUOUS'],
        ['missing', 'MISSING_FIELDS'],
        ['server', 'SERVER_UNAVAILABLE'],
      ]) {
        await page.getByLabel('Lokale bioscoopfixture').selectOption(scenario!);
        const result = await evaluate(readExpression);
        expect(result.compatibility).toBe(reason);
        expect(result.status).toBe('UNKNOWN');
        expect(result.sentinel).toBe('undefined');
        expect(result.unchanged).toBe(true);
      }
      await page.getByLabel('Lokale bioscoopfixture').selectOption('valid');
      await evaluate(readExpression);
      await page.getByLabel('Lokale bioscoopfixture').selectOption('rerender');
      expect(
        (await evaluate('globalThis.sbFixtureReader.current(100001)'))
          .compatibility,
      ).toBe('DOM_CHANGED');
      const leaseReply = fixtureLeaseReplySchema.parse(
        await page.evaluate(() =>
          chrome.runtime.sendMessage({ type: 'READONLY_BIND', role: 'A' }),
        ),
      );
      expect(leaseReply.ok).toBe(true);
      if (!leaseReply.ok) throw new Error('No fictional receipt');
      await page.getByLabel('Lokale bioscoopfixture').selectOption('valid');
      const observation = await evaluate(
        `(async()=>{await (${readExpression});return globalThis.sbFixtureReader.read(Date.now());})()`,
      );
      const message = {
        type: 'READONLY_OBSERVE',
        lease: leaseReply.lease,
        observation,
      };
      expect(
        await page.evaluate(
          (message) => chrome.runtime.sendMessage(message),
          message,
        ),
      ).toEqual({ ok: true });
      expect(
        await page.evaluate(
          (message) => chrome.runtime.sendMessage(message),
          message,
        ),
      ).toMatchObject({ ok: false });
      expect(
        await worker.evaluate(async () => ({
          local: await chrome.storage.local.get(null),
          session: await chrome.storage.session.get(null),
        })),
      ).toEqual(beforeStorage);
      expect(external).toEqual([]);
      await client.detach();
    } finally {
      await context.close();
      await rm(profile, { recursive: true, force: true });
    }
  },
);

test(
  'ZERO EXTRA native: distributed ZIP policy lab, no-fee manual preflight and no price/category retention',
  { tag: '@smoke' },
  async () => {
    test.setTimeout(60_000);
    const profile = await mkdtemp(join(tmpdir(), 'seatbuddies-zero-extra-'));
    const context = await chromium.launchPersistentContext(profile, {
      executablePath: process.env.CHROMIUM_PATH ?? chromium.executablePath(),
      ignoreDefaultArgs: ['--disable-extensions'],
      headless: process.env.HEADED !== '1',
      args: [`--load-extension=${packaged.directory}`, '--no-sandbox'],
      viewport: { width: 320, height: 900 },
    });
    try {
      const worker =
        context.serviceWorkers()[0] ??
        (await context.waitForEvent('serviceworker', { timeout: 10_000 }));
      const id = new URL(worker.url()).host;
      const page = await context.newPage();
      const external: string[] = [];
      context.on('request', (request) => {
        if (/^https?:/.test(request.url())) external.push(request.url());
      });
      const manifest = await worker.evaluate(() =>
        chrome.runtime.getManifest(),
      );
      expect(manifest.permissions).toEqual(['sidePanel', 'storage']);
      const before = await worker.evaluate(async () => ({
        local: await chrome.storage.local.get(null),
        session: await chrome.storage.session.get(null),
      }));
      await page.goto(`chrome-extension://${id}/fixture.html`);
      await exerciseSeatPairLab(page);
      await page.goto(`chrome-extension://${id}/sidepanel.html`);
      await exerciseManualCategory(page);
      await page
        .getByText('Diagnostiek zonder privégegevens', { exact: true })
        .click();
      await page.getByRole('button', { name: 'Voer zelfcontrole uit' }).click();
      await expect(page.getByTestId('diagnostic-report')).not.toContainText(
        'SAVER_LUX',
      );
      expect(
        await worker.evaluate(async () => ({
          local: await chrome.storage.local.get(null),
          session: await chrome.storage.session.get(null),
        })),
      ).toEqual(before);
      expect(external).toEqual([]);
    } finally {
      await context.close();
      await rm(profile, { recursive: true, force: true });
    }
  },
);
