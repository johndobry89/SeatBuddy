import { expect, type Page } from '@playwright/test';
import { firstPlanViaUI, openInputs, reviewViaUI } from './browser-workflow';
export async function exerciseSeatPairLab(page: Page) {
  const lab = page.getByRole('region', {
    name: 'ZERO EXTRA · twee fictieve buurstoelen',
  });
  await expect(lab).toBeVisible();
  const cases = [
    ['lux', 'FICTIONAL_CANDIDATES', 3],
    ['mixed', 'FICTIONAL_CANDIDATES', 1],
    ['ultra', 'NO_KNOWN_CANDIDATES', 0],
    ['aisle', 'NO_KNOWN_CANDIDATES', 0],
    ['gap', 'NO_KNOWN_CANDIDATES', 0],
    ['occupied', 'NO_KNOWN_CANDIDATES', 0],
    ['accessible', 'UNKNOWN', 0],
    ['accessibility-unknown', 'UNKNOWN', 0],
    ['unknown-category', 'UNKNOWN', 0],
    ['unknown-fee', 'UNKNOWN', 0],
    ['surcharge', 'NO_KNOWN_CANDIDATES', 0],
    ['mismatch', 'UNKNOWN', 0],
    ['stale', 'UNKNOWN', 0],
    ['changed', 'UNKNOWN', 0],
    ['reversed', 'FICTIONAL_CANDIDATES', 1],
    ['skipped', 'FICTIONAL_CANDIDATES', 1],
    ['wrong-row', 'UNKNOWN', 0],
    ['partial-fee', 'UNKNOWN', 0],
  ] as const;
  for (const [scenario, status, count] of cases) {
    await lab
      .getByLabel('Fictieve stoelkaart', { exact: true })
      .selectOption(scenario);
    await expect(lab.getByTestId('pair-result')).toHaveCount(0);
    await lab
      .getByRole('button', {
        name: 'Zoek 2 stoelen zonder extra betaling (DEMO)',
        exact: true,
      })
      .click();
    await expect(lab.getByTestId('pair-result')).toContainText(status);
    await expect(lab.getByTestId('pair-candidate')).toHaveCount(count);
    if (count)
      await expect(lab.getByTestId('pair-candidate').first()).not.toContainText(
        'Ultra Lux',
      );
  }
  await lab
    .getByLabel('Fictieve stoelkaart', { exact: true })
    .selectOption('accessible');
  await lab
    .getByRole('checkbox', {
      name: 'Gebruik de toegankelijkheidsroute voor deze DEMO',
    })
    .check();
  await lab
    .getByRole('button', {
      name: 'Zoek 2 stoelen zonder extra betaling (DEMO)',
      exact: true,
    })
    .click();
  await expect(lab.getByTestId('pair-candidate')).toHaveCount(1);
  await expect(lab.getByTestId('pair-candidate')).toContainText(
    'voorwaarden alleen fictief bekend',
  );
  await lab
    .getByRole('checkbox', {
      name: 'Gebruik de toegankelijkheidsroute voor deze DEMO',
    })
    .uncheck();
  await expect(lab.getByTestId('pair-result')).toHaveCount(0);
  await lab
    .getByLabel('Fictieve stoelkaart', { exact: true })
    .selectOption('accessibility-unknown');
  await lab
    .getByRole('checkbox', {
      name: 'Gebruik de toegankelijkheidsroute voor deze DEMO',
    })
    .check();
  await lab
    .getByRole('button', {
      name: 'Zoek 2 stoelen zonder extra betaling (DEMO)',
      exact: true,
    })
    .click();
  await expect(lab.getByTestId('pair-candidate')).toHaveCount(0);
  await lab
    .getByLabel('Fictieve stoelkaart', { exact: true })
    .selectOption('lux');
  const search = lab.getByRole('button', {
    name: 'Zoek 2 stoelen zonder extra betaling (DEMO)',
    exact: true,
  });
  await search.focus();
  await page.keyboard.press('Enter');
  await expect(lab.getByTestId('pair-candidate')).toHaveCount(3);
  await lab
    .getByRole('button', { name: 'Wijzig fictieve kaartversie' })
    .click();
  await expect(lab.getByTestId('pair-result')).toHaveCount(0);
  await search.click();
  await expect(lab.getByTestId('pair-result')).toContainText('STALE_DATA');
}
export async function exerciseManualCategory(page: Page) {
  await firstPlanViaUI(page, true);
  await reviewViaUI(page);
  await page.locator('#next-own-A').click();
  await openInputs(page, 'B');
  const category = page.getByLabel('Stoelcategorie B (optioneel)', {
    exact: true,
  });
  await category.focus();
  // Native select End behaviour differs on macOS; ordinary typeahead works without opening an OS menu.
  await page.keyboard.type('Ultra', { delay: 30 });
  await page.keyboard.press('Tab');
  await expect(category).toHaveValue('ULTRA_LUX');
  const saveB = page.getByRole('button', {
    name: 'Bewaar eigen invoer B',
    exact: true,
  });
  await saveB.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('preflight-issue')).toContainText('Ultra Lux');
  await expect(
    page.getByRole('button', {
      name: 'Ik heb de gegevens gecontroleerd — naar de eigen stappen',
      exact: true,
    }),
  ).toBeDisabled();
  await expect(page.getByTestId('hq-A')).toContainText('1/5');
  await expect(page.getByTestId('hq-category-B')).toContainText('EXCLUDED');
  await openInputs(page, 'B');
  await category.selectOption('SAVER_LUX');
  await page
    .getByRole('button', { name: 'Bewaar eigen invoer B', exact: true })
    .click();
  await expect(page.getByTestId('hq-category-B')).toContainText('CANDIDATE');
  await expect(page.getByTestId('hq-category-B')).toContainText(
    'Bijbetaling UNKNOWN',
  );
  await reviewViaUI(page);
  await expect(page.getByTestId('hq-A')).toContainText('1/5');
  await expect(page.getByTestId('hq-B')).toContainText('0/5');
}
