import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { gotoReady, NO_CHAOS, setChaos } from './fixtures';

// Real-browser checks for what jsdom cannot prove: history, refresh, scroll position,
// the <dialog> focus trap, Tab order and an automated accessibility scan.

const status = (page: Page) => page.getByTestId('results-status');
const grid = (page: Page) => page.getByRole('grid', { name: 'Orders' });
const scrollTop = (page: Page) => grid(page).evaluate((el) => el.scrollTop);

test.beforeEach(async ({ page }) => {
  await setChaos(page, NO_CHAOS);
});

test('API responses come from the mock service worker', async ({ page }) => {
  const response = page.waitForResponse((r) => r.url().includes('/api/orders?'));
  await gotoReady(page);
  expect((await response).fromServiceWorker()).toBe(true);
  await expect(status(page)).toHaveText('Showing 1–100 of 12,000 orders');
});

test('refresh restores the exact view, including scroll position', async ({ page }) => {
  await gotoReady(page, '/?q=an&status=delivered&sort=totalCents&dir=asc&page=2&pageSize=250');
  await expect(status(page)).toHaveText(/^Showing 251–500 of/);
  await grid(page).evaluate((el) => (el.scrollTop = 3000));
  await page.waitForTimeout(200); // scroll position is saved on the next animation frame
  const before = await page.url();

  await page.reload();
  await expect(status(page)).toHaveText(/^Showing 251–500 of/);
  expect(page.url()).toBe(before);
  await expect(page.getByRole('searchbox', { name: 'Search orders' })).toHaveValue('an');
  await expect(page.getByRole('checkbox', { name: 'Delivered' })).toBeChecked();
  await expect(page.getByRole('columnheader', { name: /total/i })).toHaveAttribute(
    'aria-sort',
    'ascending',
  );
  await expect.poll(() => scrollTop(page)).toBe(3000);
});

test('Back and Forward step through views in the real browser history', async ({ page }) => {
  await gotoReady(page, '/?pageSize=25');
  await expect(status(page)).toHaveText('Showing 1–25 of 12,000 orders');

  // click() + toBeChecked() rather than check(): the router applies the URL change as a
  // React transition, so the URL-driven checkbox updates a frame after the click.
  await page.getByRole('checkbox', { name: 'Pending' }).click();
  await expect(page.getByRole('checkbox', { name: 'Pending' })).toBeChecked();
  await expect(page).toHaveURL(/\?status=pending&pageSize=25$/);
  await page.getByRole('button', { name: 'Page 2' }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(status(page)).toHaveText(/^Showing 26–50 of/);

  await page.goBack();
  await expect(status(page)).toHaveText(/^Showing 1–25 of/);
  await expect(page.getByRole('checkbox', { name: 'Pending' })).toBeChecked();
  await page.goBack();
  await expect(status(page)).toHaveText('Showing 1–25 of 12,000 orders');
  await expect(page.getByRole('checkbox', { name: 'Pending' })).not.toBeChecked();
  await page.goForward();
  await page.goForward();
  await expect(status(page)).toHaveText(/^Showing 26–50 of/);
});

test('keyboard only: reach the grid, open an order, trap focus, close with Esc', async ({
  page,
}) => {
  await gotoReady(page, '/?pageSize=50');
  await expect(status(page)).toHaveText(/^Showing 1–50/);

  // Tab from the top of the page until a grid row has focus.
  let onRow = false;
  for (let i = 0; i < 80 && !onRow; i++) {
    await page.keyboard.press('Tab');
    onRow = await page.evaluate(() => document.activeElement?.getAttribute('role') === 'row');
  }
  expect(onRow).toBe(true);

  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  const focusedId = await page.evaluate(() =>
    document.activeElement?.getAttribute('data-order-id'),
  );
  await expect(page.locator(`[data-order-id="${focusedId}"]`)).toHaveAttribute(
    'aria-rowindex',
    '4',
  );

  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: focusedId! });
  await expect(dialog).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`/orders/${focusedId}\\?pageSize=50$`));

  // The page behind the modal is inert: Tab cycles through the drawer's controls and, as
  // native modal dialogs specify, the browser's own UI (seen by the page as <body>). No
  // element of the list behind it can ever receive focus.
  const visited = new Set<string>();
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press('Tab');
    const where = await dialog.evaluate((d) => {
      const el = document.activeElement;
      return el === document.body ? 'browser-ui' : d.contains(el) ? 'dialog' : 'BACKGROUND';
    });
    visited.add(where);
  }
  expect(visited.has('BACKGROUND')).toBe(false);
  expect(visited.has('dialog')).toBe(true);

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(page).toHaveURL(/\/\?pageSize=50$/);
  expect(await page.evaluate(() => document.activeElement?.getAttribute('data-order-id'))).toBe(
    focusedId,
  );
});

test('opening and closing the drawer keeps scroll position and filters', async ({ page }) => {
  await gotoReady(page, '/?status=shipped&pageSize=1000');
  await expect(status(page)).toHaveText(/^Showing 1–1,000 of/);
  await grid(page).evaluate((el) => (el.scrollTop = 20_000));
  const row = page.locator('[role="row"][data-order-id]').nth(5);
  const id = await row.getAttribute('data-order-id');

  await row.click(); // Playwright may scroll the row into view first, so measure afterwards
  await expect(page.getByRole('dialog', { name: id! })).toBeVisible();
  const before = await scrollTop(page);
  expect(before).toBeGreaterThan(15_000);
  await page.getByRole('button', { name: 'Close order details' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();

  expect(await scrollTop(page)).toBe(before);
  await expect(page).toHaveURL(/\/\?status=shipped&pageSize=1000$/);
  await expect(page.getByRole('checkbox', { name: 'Shipped' })).toBeChecked();
});

test('a deep link to an order survives a refresh', async ({ page }) => {
  await gotoReady(page, '/orders/ORD-100500?country=SE');
  await expect(page.getByRole('dialog', { name: 'ORD-100500' }).getByRole('table')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('dialog', { name: 'ORD-100500' }).getByRole('table')).toBeVisible();
  await expect(status(page)).toHaveText(/^Showing/);
});

test('failures are shown honestly and can be retried, using the in-app simulator', async ({
  page,
}) => {
  await gotoReady(page, '/?pageSize=25');
  await expect(status(page)).toHaveText('Showing 1–25 of 12,000 orders');

  await page.getByText('Network simulation').click();
  await page.getByRole('radio', { name: 'Always' }).check();
  await page.keyboard.press('Escape');

  await page.getByRole('checkbox', { name: 'Refunded' }).click();
  await expect(page.getByRole('checkbox', { name: 'Refunded' })).toBeChecked();
  const listError = page.getByRole('alert').filter({ hasText: 'Couldn’t load orders' });
  await expect(listError).toBeVisible({ timeout: 10_000 });
  await expect(grid(page)).toHaveCount(0); // old rows are not left on screen

  await page.getByText('Network simulation').click();
  await page.getByRole('radio', { name: 'Never' }).check();
  await page.keyboard.press('Escape');
  await listError.getByRole('button', { name: 'Retry' }).click();
  await expect(status(page)).toHaveText(/^Showing 1–25 of/);
  await expect(listError).toHaveCount(0);
});

test('has no detectable accessibility violations (list and drawer)', async ({ page }) => {
  await gotoReady(page, '/?status=pending&pageSize=25');
  await expect(status(page)).toHaveText(/^Showing/);
  const list = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(list.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.length})`)).toEqual([]);

  await page.locator('[role="row"][data-order-id]').first().click();
  await expect(page.getByRole('dialog').getByRole('table')).toBeVisible();
  const drawer = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(drawer.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.length})`)).toEqual([]);
});

test('mobile layout: filters open as a panel and the page does not scroll sideways', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await gotoReady(page, '/');
  await expect(status(page)).toHaveText(/^Showing/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );

  const toggle = page.getByRole('button', { name: /^Filters/ });
  await expect(page.getByRole('checkbox', { name: 'Shipped' })).toBeHidden();
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await page.getByRole('checkbox', { name: 'Shipped' }).click();
  await expect(page.getByRole('checkbox', { name: 'Shipped' })).toBeChecked();
  await expect(page).toHaveURL(/status=shipped/);
});
