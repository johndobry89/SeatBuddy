import { chromium, expect, test } from '@playwright/test';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  unpackActionsArtifact,
  unpackExtensionArchive,
} from '../helpers/packaged-extension';
import { publicShowing } from '../fixtures/vue-page-reader';
import {
  dynamicLuxPage,
  identityLuxPage,
  fixtureIdentityPath,
  dynamicRankPage,
  fixtureIconPath,
} from '../fixtures/vue-legend';
import { seatPage } from '../fixtures/vue-seatmap';
import {
  bookingAlpha,
  bookingBeta,
  quickSelected,
} from '../fixtures/vue-header';

test('packaged experiment: native action grant, one popup click, fixture-only isolated observation, no retained data', async () => {
  test.setTimeout(45_000);
  const label = '0.11.6-experimental';
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
    '6514244749b0035655c52471300dae65bf962dfe2769b6508485925c79e148e1',
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
    let fixtureHtml = publicShowing;
    const heroUrl = 'https://www.vuecinemas.nl/kopen/overzicht/fictief';
    await context.route(/^https?:/, async (route) => {
      if (
        [fixtureUrl, heroUrl].includes(route.request().url()) &&
        route.request().resourceType() === 'document'
      )
        await route.fulfill({ contentType: 'text/html', body: fixtureHtml });
      else if (
        ['ultra', 'lux', 'saver', 'super', 'special'].some((key) =>
          [fixtureIconPath(key), fixtureIdentityPath(key)].some(
            (path) =>
              route.request().url() === `https://www.vuecinemas.nl${path}`,
          ),
        ) &&
        route.request().resourceType() === 'image'
      )
        await route.fulfill({
          contentType: 'image/svg+xml',
          body: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><rect width="16" height="16"/></svg>',
        });
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
    await expect(
      popup.getByRole('button', { name: 'Kopieer rapport', exact: true }),
    ).toBeDisabled();
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
    ).toBeEnabled();
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
    await fresh.close();
    // Same one button, with real Chrome serialization/visibility for both new sources.
    fixtureHtml = quickSelected;
    await source.reload();
    const quick = await openPopup();
    await quick
      .getByRole('button', { name: 'Lees deze Vue-pagina', exact: true })
      .click();
    await expect(quick.getByTestId('page-read-result')).toHaveAttribute(
      'data-source',
      'VISIBLE_QUICK_TICKET',
    );
    for (const [key, value] of Object.entries({
      movie: 'Demo Alpha',
      cinema: 'Vue Teststad',
      date: 'za 13 apr',
      time: '20:45',
    }))
      await expect(quick.getByTestId(`read-${key}`)).toHaveText(value);
    await expect(quick.getByTestId('read-hall')).toHaveText('ONBEKEND');
    // Test-only clipboard double: real button/keyboard and awaited success/error.
    await quick.evaluate(() => {
      Object.defineProperty(navigator.clipboard, 'writeText', {
        configurable: true,
        value: async (text: string) => {
          Reflect.set(window, 'fixtureReport', text);
        },
      });
    });
    const copy = quick.getByRole('button', {
      name: 'Kopieer rapport',
      exact: true,
    });
    await copy.focus();
    await copy.press('Enter');
    await expect(quick.getByTestId('copy-report-status')).toHaveText(
      'Gekopieerd',
    );
    const report = await quick.evaluate(
      () => Reflect.get(window, 'fixtureReport') as string,
    );
    expect(report).toContain('Datum: za 13 apr');
    expect(report).toContain('Zaal: ONBEKEND');
    expect(report).toContain('Movie Pass-bijbetaling niet gecontroleerd');
    expect(report).not.toMatch(/https?:|data:|@|fictief-geheim|2030/);
    await quick.evaluate(() =>
      Object.defineProperty(navigator.clipboard, 'writeText', {
        configurable: true,
        value: async () => {
          throw new Error('fixture denial');
        },
      }),
    );
    await copy.click();
    await expect(quick.getByTestId('copy-report-status')).toContainText(
      'Rapport niet gekopieerd',
    );

    await source.evaluate(() => {
      document.querySelector(
        'li[data-test="quick-book-film-selector"] .dropdown-opener__title-value',
      )!.textContent = 'Demo Beta';
    });

    await quick.evaluate(() => {
      const original = chrome.scripting.executeScript.bind(chrome.scripting);
      const barrier = new Promise<void>((resolve) =>
        Reflect.set(window, 'releaseFixtureRead', resolve),
      );
      chrome.scripting.executeScript = (async (
        injection: chrome.scripting.ScriptInjection<[], unknown>,
      ) => {
        await barrier; // test-only explicit pending-read barrier
        return original(injection);
      }) as typeof chrome.scripting.executeScript;
    });
    await quick
      .getByRole('button', { name: 'Lees deze Vue-pagina', exact: true })
      .click();
    await expect(copy).toBeDisabled();
    await expect(quick.getByTestId('copy-report-status')).toHaveText('');
    await quick.evaluate(() => Reflect.get(window, 'releaseFixtureRead')());
    await expect(quick.getByTestId('read-movie')).toHaveText('Demo Beta');
    await expect(copy).toBeEnabled();
    await quick.close();
    fixtureHtml = bookingAlpha;
    await source.goto(heroUrl);
    const hero = await openPopup();
    await hero
      .getByRole('button', { name: 'Lees deze Vue-pagina', exact: true })
      .click();
    await expect(hero.getByTestId('page-read-result')).toHaveAttribute(
      'data-source',
      'VISIBLE_BOOKING_HERO',
    );
    for (const [key, value] of Object.entries({
      movie: 'Demo Alpha',
      cinema: 'Vue Teststad',
      date: '2030-04-12',
      time: '19:30',
      hall: 'Zaal 2',
    }))
      await expect(hero.getByTestId(`read-${key}`)).toHaveText(value);
    await hero.close();
    fixtureHtml = seatPage
      .replaceAll('width:20px', 'width:22px')
      .replace('left:24px', 'left:28px');
    await source.reload();
    const seats = await openPopup();
    await seats
      .getByRole('button', { name: 'Lees deze Vue-pagina', exact: true })
      .click();
    await expect(seats.getByTestId('seat-counts')).toHaveText(
      '6 beschikbaar · 1 niet beschikbaar · 1 geselecteerd · 0 onbekend',
    );
    await expect(seats.getByTestId('seat-pairs').locator('li')).toHaveCount(1);
    await expect(seats.getByTestId('seat-pairs')).toHaveText(
      'Rij 1: 1 + 2 · Lux',
    );
    await expect(seats.getByTestId('read-seats')).toContainText(
      'Mogelijk naast elkaar',
    );
    expect(
      await seats.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    // Synthetic page mutation, then a second explicit user read: no inherited legend/pair.
    await source.evaluate(() =>
      document
        .querySelectorAll('.seats-category')
        .forEach((node) => node.remove()),
    );
    await seats
      .getByRole('button', { name: 'Lees deze Vue-pagina', exact: true })
      .click();
    await expect(seats.getByTestId('seat-pairs')).toHaveCount(0);
    await expect(seats.getByTestId('read-seats')).toContainText(
      'Legenda-koppeling ONBEKEND',
    );
    await seats.close();
    for (const [html, scheme, category, hall] of [
      [dynamicLuxPage, 'LUX_4', 'Lux', 'Zaal 2'],
      [identityLuxPage, 'LUX_4', 'Lux', 'Zaal 2'],
      [dynamicRankPage, 'RANK_3', 'Regular', 'Zaal 6 Dolby Cinema'],
    ]) {
      fixtureHtml = html!;
      await source.reload();
      const variant = await openPopup();
      await variant
        .getByRole('button', { name: 'Lees deze Vue-pagina', exact: true })
        .click();
      await expect(variant.getByTestId('read-hall')).toHaveText(hall!);
      await expect(variant.getByTestId('seat-diagnostic')).toContainText(
        scheme!,
      );
      await expect(variant.getByTestId('seat-pairs')).toHaveText(
        `Rij 1: 1 + 2 · ${category}`,
      );
      await expect(variant.getByTestId('read-seats')).toContainText(
        'Movie Pass-bijbetaling niet gecontroleerd',
      );
      expect(
        await variant.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await variant.close();
    }
    fixtureHtml = bookingBeta;
    await source.reload();
    const checkout = await openPopup();
    await checkout
      .getByRole('button', { name: 'Lees deze Vue-pagina', exact: true })
      .click();
    await expect(checkout.getByTestId('page-read-result')).toContainText(
      'NIET BESCHIKBAAR',
    );
    await expect(checkout.getByTestId('read-movie')).toHaveCount(0);
    await expect(checkout.getByTestId('read-seats')).toHaveCount(0);
    await expect(
      checkout.getByRole('button', { name: 'Kopieer rapport', exact: true }),
    ).toBeDisabled();
    await expect(checkout.locator('body')).not.toContainText(
      'dummy-private-value',
    );
    expect(
      await worker.evaluate(async () => ({
        local: await chrome.storage.local.get(null),
        session: await chrome.storage.session.get(null),
      })),
    ).toEqual(storageBefore);
    expect(
      await worker.evaluate(() =>
        Reflect.get(globalThis, 'experimentMessages'),
      ),
    ).toBe(0);
    expect(unexpected).toEqual([]);
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
