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
import { duoPage } from '../fixtures/duo-handoff';
import { parseDuoPlan } from '../../src/experiment/duo-plan';
import { seatPage, seat } from '../fixtures/vue-seatmap';
import {
  bookingAlpha,
  bookingBeta,
  quickSelected,
} from '../fixtures/vue-header';

async function experimentPackage() {
  const label = '0.11.8-experimental';
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
  expect(packaged.sha256).toBe(
    'cb8ab60cd84ee118b6fa860a4a5327bc8a6bb626ac0c321221cdf99ed2e32e78',
  );
  return packaged;
}

test('packaged experiment: native action grant, one popup click, fixture-only isolated observation, no retained data', async () => {
  test.setTimeout(45_000);
  const packaged = await experimentPackage();
  const profile = await mkdtemp(join(tmpdir(), 'seatbuddies-read-spike-'));
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
      await expect(variant.locator('body')).toContainText(
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

test('duo handoff: verified ZIP in two independent profiles, explicit pair and exact fresh target, honest STOP and no retention', async () => {
  test.setTimeout(60_000);
  const packaged = await experimentPackage();
  const profiles: string[] = [];
  const contexts: Awaited<
    ReturnType<typeof chromium.launchPersistentContext>
  >[] = [];
  const previous = process.env.PW_CHROMIUM_ATTACH_TO_OTHER;
  process.env.PW_CHROMIUM_ATTACH_TO_OTHER = '1';
  try {
    async function actor(forA: boolean) {
      const profile = await mkdtemp(join(tmpdir(), 'seatbuddies-duo-'));
      profiles.push(profile);
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
      contexts.push(context);
      const worker =
        context.serviceWorkers()[0] ??
        (await context.waitForEvent('serviceworker', { timeout: 10_000 }));
      const id = new URL(worker.url()).host;
      await worker.evaluate(() => {
        Reflect.set(globalThis, 'duoMessages', 0);
        chrome.runtime.onMessage.addListener(() =>
          Reflect.set(
            globalThis,
            'duoMessages',
            Reflect.get(globalThis, 'duoMessages') + 1,
          ),
        );
      });
      const storageBefore = await worker.evaluate(async () => ({
        local: await chrome.storage.local.get(null),
        session: await chrome.storage.session.get(null),
      }));
      const unexpected: string[] = [];
      const url = 'https://www.vuecinemas.nl/kopen/overzicht/fictief';
      await context.route(/^https?:/, async (route) => {
        if (
          route.request().url() === url &&
          route.request().resourceType() === 'document'
        )
          await route.fulfill({
            contentType: 'text/html',
            body: duoPage(forA).replaceAll('Zaal 2', 'Zaal 6 Dolby Cinema'),
          });
        else {
          unexpected.push(route.request().resourceType());
          await route.abort();
        }
      });
      const source = await context.newPage();
      await source.goto(url);
      const browser = context.browser();
      if (!browser) throw new Error('Browser CDP required');
      const control = await browser.newBrowserCDPSession();
      const { targetInfos } = await control.send('Target.getTargets', {
        filter: [{ type: 'tab' }],
      });
      const targets = targetInfos.filter((target) => target.url === url);
      expect(targets).toHaveLength(1);
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
      const assertPrivacy = async () => {
        expect(
          await worker.evaluate(async () => ({
            local: await chrome.storage.local.get(null),
            session: await chrome.storage.session.get(null),
          })),
        ).toEqual(storageBefore);
        expect(
          await worker.evaluate(() => Reflect.get(globalThis, 'duoMessages')),
        ).toBe(0);
        expect(unexpected).toEqual([]);
      };
      return { popup, source, assertPrivacy };
    }
    const a = await actor(true);
    await a.popup
      .getByRole('button', { name: 'Lees deze Vue-pagina', exact: true })
      .click();
    const choice = a.popup.getByRole('radio');
    await expect(choice).toHaveCount(3);
    await expect(a.popup.locator('input:checked')).toHaveCount(0);
    const copy = a.popup.getByRole('button', {
      name: 'Kopieer duo-plan',
      exact: true,
    });
    await expect(copy).toHaveCount(0);
    await choice.first().focus();
    await choice.first().press('Space');
    await a.popup.evaluate(() =>
      Object.defineProperty(navigator.clipboard, 'writeText', {
        configurable: true,
        value: async (text: string) => {
          Reflect.set(window, 'fixtureDuo', text);
        },
      }),
    );
    await copy.focus();
    await copy.press('Enter');
    await expect(a.popup.getByTestId('copy-report-status')).toHaveText(
      'Gekopieerd',
    );
    const text = await a.popup.evaluate(
      () => Reflect.get(window, 'fixtureDuo') as string,
    );
    expect(parseDuoPlan(text).pair).toMatchObject({ A: 5, B: 6 });
    const fits = async (page: typeof a.popup) =>
      page.evaluate(() => ({
        width: innerWidth,
        height: document.documentElement.scrollHeight,
        noHorizontalScroll: document.documentElement.scrollWidth <= innerWidth,
      }));
    const aSize = await fits(a.popup);
    expect(aSize.noHorizontalScroll).toBe(true);
    expect(aSize.height).toBeLessThanOrEqual(600);
    await a.popup.screenshot({ path: 'test-results/duo-A-fixture.png' });
    // Clipboard denial is not reported as copied. No automatic clipboard reading.
    await a.popup.evaluate(() =>
      Object.defineProperty(navigator.clipboard, 'writeText', {
        configurable: true,
        value: async () => {
          throw new Error('fixture denial');
        },
      }),
    );
    await copy.click();
    await expect(a.popup.getByTestId('copy-report-status')).toContainText(
      'Duo-plan niet gekopieerd',
    );
    // The second browser context is a separate disk profile, not another tab/login.
    const b = await actor(false);
    expect(profiles[0]).not.toBe(profiles[1]);
    await b.popup.getByText('Duo-plan ontvangen', { exact: true }).click();
    const input = b.popup.getByLabel(
      'Plak duo-plan in je eigen Chrome-profiel',
    );
    await input.fill(text);
    await b.popup.evaluate(() => {
      const original = chrome.scripting.executeScript.bind(chrome.scripting);
      Reflect.set(window, 'duoInjections', 0);
      chrome.scripting.executeScript = (async (
        injection: chrome.scripting.ScriptInjection<unknown[], unknown>,
      ) => {
        Reflect.set(
          window,
          'duoInjections',
          Reflect.get(window, 'duoInjections') + 1,
        );
        const barrier = Reflect.get(window, 'duoBarrier') as
          Promise<void> | undefined;
        if (barrier) await barrier;
        return original(injection);
      }) as typeof chrome.scripting.executeScript;
    });
    const check = b.popup.getByRole('button', {
      name: 'Controleer duo-plan op deze Vue-pagina',
      exact: true,
    });
    await check.click();
    await expect(b.popup.getByTestId('duo-status')).toHaveAttribute(
      'data-status',
      'DUO_MATCH_POSSIBLE',
    );
    expect(
      await b.popup.evaluate(() => Reflect.get(window, 'duoInjections')),
    ).toBe(1);
    await expect(b.popup.getByTestId('seat-pairs')).toHaveCount(0);
    await expect(b.popup.locator('body')).toContainText(
      'A: rij 1, stoel 5 · B: stoel 6',
    );
    const bSize = await fits(b.popup);
    expect(bSize.noHorizontalScroll).toBe(true);
    expect(bSize.height).toBeLessThanOrEqual(600);
    await b.popup.screenshot({ path: 'test-results/duo-B-fixture.png' });
    // A delayed browser reply cannot resurrect a plan after input changed away
    // and back to the same text. This exercises the local observation revision.
    await b.popup.evaluate(() =>
      Reflect.set(
        window,
        'duoBarrier',
        new Promise<void>((resolve) =>
          Reflect.set(window, 'releaseDuo', resolve),
        ),
      ),
    );
    await check.click();
    await expect(b.popup.getByTestId('duo-status')).not.toHaveAttribute(
      'data-status',
      'DUO_MATCH_POSSIBLE',
    );
    await input.fill('changed');
    await input.fill(text);
    await b.popup.evaluate(() => Reflect.get(window, 'releaseDuo')());
    await expect(check).toBeEnabled();
    await expect(b.popup.getByTestId('duo-status')).not.toHaveAttribute(
      'data-status',
      'DUO_MATCH_POSSIBLE',
    );
    // The same chosen target is outside B's top three. A newly observed UNKNOWN
    // neighbour must reject it through the shared one-seat buffer, with no click on Vue.
    await b.source.evaluate(
      (html) =>
        document
          .querySelector('[data-test="seats-row-1"]')!
          .insertAdjacentHTML('beforeend', html),
      seat(1, 7, 7, 'special'),
    );
    await check.click();
    await expect(b.popup.getByTestId('duo-status')).toHaveAttribute(
      'data-status',
      'UNKNOWN_STOP',
    );
    await b.source.evaluate(() =>
      document.querySelector('[data-test="fake-seat-1-7"]')!.remove(),
    );
    // Only fixture DOM is mutated. A new conscious check invalidates prior GO.
    await b.source.evaluate(() => {
      const button = document.querySelector<HTMLButtonElement>(
        '[data-test="fake-seat-1-6"]',
      )!;
      button.setAttribute('aria-label', 'Seat 1-6, unavailable');
      button.disabled = true;
    });
    await check.click();
    await expect(b.popup.getByTestId('duo-status')).toHaveAttribute(
      'data-status',
      'PAIR_UNAVAILABLE',
    );
    const beforeInvalid = await b.popup.evaluate(() =>
      Reflect.get(window, 'duoInjections'),
    );
    await input.fill(text.replace('Demo Alpha', 'account: hidden'));
    await expect(b.popup.getByTestId('duo-status')).not.toHaveAttribute(
      'data-status',
      'PAIR_UNAVAILABLE',
    );
    await check.click();
    await expect(b.popup.getByTestId('duo-status')).toHaveAttribute(
      'data-status',
      'UNKNOWN_STOP',
    );
    await expect(b.popup.locator('body')).not.toContainText('Mogelijk passend');
    expect(
      await b.popup.evaluate(() => Reflect.get(window, 'duoInjections')),
    ).toBe(beforeInvalid);
    // Closing B destroys the import/result; nothing is restored from storage.
    await b.popup.close();
    await a.assertPrivacy();
    await b.assertPrivacy();
    console.log(
      `DUO FIXTURE_NATIVE PASS two independent profiles; popup A ${aSize.width}x${aSize.height}, B ${bSize.width}x${bSize.height}; HUMAN_TASK_SPEEDUP NOT_RUN; OWNER_LIVE_DUO NOT_RUN`,
    );
  } finally {
    for (const context of contexts) await context.close();
    for (const profile of profiles)
      await rm(profile, { recursive: true, force: true });
    await packaged.cleanup();
    if (previous === undefined) delete process.env.PW_CHROMIUM_ATTACH_TO_OTHER;
    else process.env.PW_CHROMIUM_ATTACH_TO_OTHER = previous;
  }
});
