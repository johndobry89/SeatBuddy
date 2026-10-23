import { chromium, expect, test } from '@playwright/test';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  unpackActionsArtifact,
  unpackExtensionArchive,
} from '../helpers/packaged-extension';
import { publicShowing } from '../fixtures/vue-page-reader';

test('packaged experiment: native action grant, one popup click, fixture-only isolated observation, no retained data', async () => {
  test.setTimeout(45_000);
  const label = '0.11.1-experimental';
  const path = `build/experiment/seatbuddies-${label}-chrome-test.zip`;
  const packaged = process.env.SEATBUDDIES_EXPERIMENT_ARTIFACT_ZIP
    ? await unpackActionsArtifact(
        await readFile(process.env.SEATBUDDIES_EXPERIMENT_ARTIFACT_ZIP),
        label,
        process.env.SEATBUDDIES_EXPERIMENT_ARTIFACT_SHA256 ?? '',
      )
    : await unpackExtensionArchive(
        await readFile(path),
        await readFile(`${path}.sha256`, 'utf8'),
        label,
      );
  const profile = await mkdtemp(join(tmpdir(), 'seatbuddies-read-spike-'));
  expect(packaged.sha256).toBe(
    '727e39c9b7992b3789abe2854aba25dcb2080b54b21e8724338b4df6d8ed5bd9',
  );
  const previous = process.env.PW_CHROMIUM_ATTACH_TO_OTHER;
  process.env.PW_CHROMIUM_ATTACH_TO_OTHER = '1';
  const context = await chromium.launchPersistentContext(profile, {
    executablePath: process.env.CHROMIUM_PATH ?? chromium.executablePath(),
    ignoreDefaultArgs: ['--disable-extensions'],
    headless: process.env.HEADED !== '1',
    args: [
      `--load-extension=${packaged.directory}`,
      '--enable-unsafe-extension-debugging',
      '--no-sandbox',
    ],
  });
  try {
    const worker =
      context.serviceWorkers()[0] ??
      (await context.waitForEvent('serviceworker', { timeout: 10_000 }));
    const id = new URL(worker.url()).host;
    await worker.evaluate(() => {
      Reflect.set(globalThis, 'experimentMessages', 0);
      chrome.runtime.onMessage.addListener(() => {
        Reflect.set(
          globalThis,
          'experimentMessages',
          Reflect.get(globalThis, 'experimentMessages') + 1,
        );
      });
    });
    expect(
      await worker.evaluate(() => chrome.runtime.getManifest().permissions),
    ).toEqual(['sidePanel', 'storage', 'activeTab', 'scripting']);
    const storageBefore = await worker.evaluate(async () => ({
      local: await chrome.storage.local.get(null),
      session: await chrome.storage.session.get(null),
    }));
    // Test-only synthetic document at the allowed origin. Every HTTP request is
    // fulfilled locally or aborted: no real Vue response, account or endpoint.
    const fixtureUrl =
      'https://www.vuecinemas.nl/seatbuddies-invented-public-fixture';
    const unexpected: string[] = [];
    await context.route(/^https?:/, async (route) => {
      if (
        route.request().url() === fixtureUrl &&
        route.request().resourceType() === 'document'
      )
        await route.fulfill({ contentType: 'text/html', body: publicShowing });
      else {
        unexpected.push(route.request().resourceType());
        await route.abort();
      }
    });
    const source = await context.newPage();
    await source.goto(fixtureUrl);
    const browser = context.browser();
    if (!browser)
      throw new Error('Browser-level CDP required for the native action test');
    const control = await browser.newBrowserCDPSession();
    // triggerAction requires the browser's TAB target, not its PAGE target.
    const { targetInfos } = await control.send('Target.getTargets', {
      filter: [{ type: 'tab' }],
    });
    const targets = targetInfos.filter((target) => target.url === fixtureUrl);
    expect(targets).toHaveLength(1);
    const openPopup = async () => {
      const [popup] = await Promise.all([
        context.waitForEvent('page', {
          predicate: (page) =>
            page.url().split(/[?#]/)[0] ===
            `chrome-extension://${id}/popup.html`,
        }),
        control.send('Extensions.triggerAction', {
          id,
          targetId: targets[0]!.targetId,
        }),
      ]);
      return popup;
    };
    // CDP's browser action emulates the icon click, unlike action.openPopup,
    // which alone does not establish activeTab. The subsequent button is real UI.
    const popup = await openPopup();
    await expect(popup.locator('input, select, textarea')).toHaveCount(0);
    await expect(popup.getByTestId('legacy-tools')).toHaveCount(0);
    await expect(popup.getByTestId('read-movie')).toHaveCount(0);
    await popup
      .getByRole('button', { name: 'Lees deze Vue-pagina', exact: true })
      .click();
    for (const [key, value] of Object.entries({
      movie: 'De maan van papier',
      cinema: 'Fictief Filmhuis',
      date: '2030-04-12',
      time: '19:30',
      hall: 'Zaal 2',
    })) {
      await expect(popup.getByTestId(`read-${key}`)).toHaveText(value);
      await expect(popup.getByTestId(`read-${key}`)).toHaveAttribute(
        'data-evidence',
        'OBSERVED_VISIBLE',
      );
    }
    await expect(
      popup.getByRole('button', { name: 'Lees deze Vue-pagina', exact: true }),
    ).toBeDisabled();
    await expect(popup.getByTestId('page-read-result')).toContainText(
      'niet bevestigd door Vue',
    );
    await expect(popup.getByTestId('primary-action')).toHaveAttribute(
      'href',
      'https://www.vuecinemas.nl/',
    );
    await popup.screenshot({ path: 'test-results/vue-read-spike-fixture.png' });
    expect(
      await worker.evaluate(async () => ({
        local: await chrome.storage.local.get(null),
        session: await chrome.storage.session.get(null),
      })),
    ).toEqual(storageBefore);
    expect(unexpected).toEqual([]);
    expect(
      await worker.evaluate(() =>
        Reflect.get(globalThis, 'experimentMessages'),
      ),
    ).toBe(0);
    // Closing the popup destroys its observation. A fresh popup has no result.
    await popup.close();
    const fresh = await openPopup();
    await expect(
      fresh.getByRole('button', { name: 'Lees deze Vue-pagina', exact: true }),
    ).toBeEnabled();
    await expect(fresh.getByTestId('read-movie')).toHaveCount(0);
    console.log(
      `EXPERIMENT FIXTURE_NATIVE PASS SHA256 ${packaged.sha256}; OWNER_MANUAL_LIVE NOT_RUN`,
    );
  } finally {
    await context.close();
    await packaged.cleanup();
    await rm(profile, { recursive: true, force: true });
    if (previous === undefined) delete process.env.PW_CHROMIUM_ATTACH_TO_OTHER;
    else process.env.PW_CHROMIUM_ATTACH_TO_OTHER = previous;
  }
});
