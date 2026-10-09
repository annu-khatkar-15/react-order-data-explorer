import { expect, test } from '@playwright/test';
import { gotoReady, NO_CHAOS, setChaos } from './fixtures';

// Verifies the mock API end to end through the real service worker: the dataset size is
// measured, not hardcoded, and paging through every page yields each order exactly once.

interface PageBody {
  items: { id: string }[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

test.beforeEach(async ({ page }) => {
  await setChaos(page, NO_CHAOS);
  await gotoReady(page);
});

test('every page of 25 is full and distinct, covering the whole dataset once', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const get = async (p: number) =>
      (await (await fetch(`/api/orders?pageSize=25&page=${p}`)).json()) as PageBody;
    const first = await get(1);
    const pages = [first];
    for (let p = 2; p <= first.pageCount; p++) pages.push(await get(p));
    const ids = pages.flatMap((pg) => pg.items.map((o) => o.id));
    return {
      total: first.total,
      pageCount: first.pageCount,
      pagesFetched: pages.length,
      itemsPerPage: [...new Set(pages.map((pg) => pg.items.length))],
      idCount: ids.length,
      uniqueIds: new Set(ids).size,
      firstIdsOfPage1: first.items.slice(0, 3).map((o) => o.id),
    };
  });

  console.log('Dataset check:', JSON.stringify(result));
  expect(result.total).toBe(12_000);
  expect(result.pageCount).toBe(480);
  expect(result.pagesFetched).toBe(480);
  expect(result.itemsPerPage).toEqual([25]); // every single page has exactly 25 rows
  expect(result.idCount).toBe(result.total);
  expect(result.uniqueIds).toBe(result.total); // no order repeats across pages
});

test('the dataset is identical after a reload', async ({ page }) => {
  const fingerprint = () =>
    page.evaluate(async () => {
      const body = (await (
        await fetch('/api/orders?pageSize=1000&page=7&sort=totalCents')
      ).json()) as {
        items: { id: string; totalCents: number; customerName: string }[];
      };
      return body.items.map((o) => `${o.id}:${o.totalCents}:${o.customerName}`).join('|');
    });
  const before = await fingerprint();
  await page.reload();
  await page.locator('html[data-mock-api="ready"]').waitFor({ state: 'attached' });
  expect(await fingerprint()).toBe(before);
});
