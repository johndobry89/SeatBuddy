import { expect, type Page } from '@playwright/test';

/** Product assertions shared by transport-double and packaged native tests. */
export async function checkProductShell(page: Page) {
  const home = page.getByTestId('product-home');
  await expect(
    home.getByRole('heading', { name: 'Verder op Vue' }),
  ).toBeVisible();
  await expect(
    home.locator('input:visible, select:visible, textarea:visible'),
  ).toHaveCount(0);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('.primary-action:visible')).toHaveCount(1);
  await expect(page.getByTestId('legacy-tools')).toHaveCount(0);
  await expect(page.getByTestId('developer-tools')).not.toHaveAttribute('open');
  await expect(home).not.toContainText(
    /UNKNOWN|BUDDY_CHANGED|MANUAL_SELF_REPORT|FICTIONAL_TEST|Start simulatie/,
  );
  const cta = page.getByTestId('primary-action');
  await expect(cta).toHaveAttribute('href', 'https://www.vuecinemas.nl/');
  await expect(cta).toHaveAttribute('rel', 'noopener noreferrer');
  await cta.focus();
  await expect(cta).toBeFocused();
  const bounds = await page.evaluate(() => ({
    height: document.documentElement.scrollHeight,
    clientHeight: innerHeight,
    width: document.documentElement.scrollWidth,
    clientWidth: innerWidth,
  }));
  expect(bounds.width, JSON.stringify(bounds)).toBeLessThanOrEqual(
    bounds.clientWidth,
  );
  expect(bounds.height, JSON.stringify(bounds)).toBeLessThanOrEqual(
    bounds.clientHeight,
  );
  return bounds;
}

export async function exerciseCompactPrototype(page: Page) {
  const prototype = page.getByRole('region', {
    name: 'Compact fictief Quick Ticket-prototype',
  });
  await prototype
    .getByRole('button', { name: 'Kies deze fictieve voorstelling' })
    .click();
  await expect(prototype.getByTestId('prototype-reviews')).toHaveText(
    'A: zelf bekijken · B: zelf bekijken',
  );
  await prototype
    .getByRole('button', { name: 'A: fictief overzicht bekeken' })
    .click();
  await expect(prototype.getByTestId('prototype-reviews')).toHaveText(
    'A: fictief bekeken · B: zelf bekijken',
  );
  await prototype
    .getByRole('button', { name: 'B: fictief overzicht bekeken' })
    .click();
  await expect(prototype.getByRole('heading')).toHaveText(
    'Twee fictieve overzichten bekeken',
  );
  await expect(prototype).toContainText('Niets gereserveerd');
}
