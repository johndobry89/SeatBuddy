import { expect, type Page } from '@playwright/test';
export const fakePlan = {
  movie: 'De maan van papier',
  cinema: 'Fictief Filmhuis',
  date: '2030-04-12',
  time: '19:30',
  hall: 'Zaal 2',
};
export async function openInputs(page: Page, role: string) {
  if (!(await page.locator(`#row-${role}`).isVisible()))
    await page
      .getByText(`Voorstelling en stoel voor ${role} controleren`, {
        exact: true,
      })
      .click();
}
export async function enterSeats(page: Page, roles: readonly string[] = ['A']) {
  for (const role of roles) {
    await openInputs(page, role);
    await page.locator(`#row-${role}`).fill('F');
    await page.locator(`#seat-${role}`).fill(role === 'A' ? '10' : '11');
    await page
      .getByRole('button', { name: `Bewaar eigen invoer ${role}`, exact: true })
      .click();
  }
}
export async function reviewViaUI(page: Page) {
  const button = page.getByRole('button', {
    name: 'Ik heb de gegevens gecontroleerd — naar de eigen stappen',
    exact: true,
  });
  await expect(button).toBeEnabled();
  await button.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('[id^="next-own-"]').first()).toBeFocused();
}
export async function planViaUI(page: Page, together = false) {
  for (const [field, value] of Object.entries(fakePlan))
    await page.locator(`#plan-${field}`).fill(value);
  await page
    .getByRole('button', { name: 'Bewaar filmplan', exact: true })
    .click();
  if (together)
    await page
      .getByRole('button', { name: 'Ook met buddy plannen', exact: true })
      .click();
}

export async function openSimulation(page: Page) {
  const button = page.getByRole('button', {
    name: 'Simulatie / technische proef',
    exact: true,
  });
  if (!(await button.isVisible()))
    await page
      .getByText('Diagnostiek zonder privégegevens', { exact: true })
      .click();
  await button.click();
}
export async function firstPlanViaUI(page: Page, together = false) {
  if (together)
    await page
      .getByRole('button', { name: 'Ook met buddy plannen', exact: true })
      .click();
  for (const [field, value] of Object.entries(fakePlan))
    await page.locator(`#plan-${field}`).fill(value);
  for (const role of together ? ['A', 'B'] : ['A']) {
    await page.locator(`#plan-row-${role}`).fill('F');
    await page.locator(`#plan-seat-${role}`).fill(role === 'A' ? '10' : '11');
  }
  await page
    .getByRole('button', { name: 'Bewaar filmplan', exact: true })
    .click();
}

/** Legacy safety regressions explicitly enter the optional developer section.
 * The pinned pre-reboot upgrade baseline has no disclosure and stays supported. */
export async function openDeveloperTools(page: Page) {
  const path = new URL(page.url()).pathname;
  if (!['/sidepanel.html', '/popup.html'].includes(path)) return;
  await page
    .locator('[data-testid="developer-tools"], h1')
    .first()
    .waitFor({ state: 'visible' });
  const tools = page.getByTestId('developer-tools');
  if (!(await tools.count())) return;
  if (
    !(await tools.evaluate((element) => (element as HTMLDetailsElement).open))
  )
    await tools.getByText('Ontwikkelaarstests', { exact: true }).click();
  await expect(page.getByTestId('legacy-tools')).toBeVisible();
}
export async function gotoDeveloper(page: Page, url: string) {
  await page.goto(url);
  await openDeveloperTools(page);
}
export async function reloadDeveloper(page: Page) {
  await page.reload();
  await openDeveloperTools(page);
}
