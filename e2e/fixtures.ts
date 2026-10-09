import type { Page } from '@playwright/test';
import type { ChaosConfig } from '../src/mocks/chaos';

const CHAOS_STORAGE_KEY = 'order-explorer:chaos';

/** Sets mock-API latency and failure rate before the app boots. */
export async function setChaos(page: Page, chaos: Partial<ChaosConfig>) {
  await page.addInitScript(([key, value]) => window.localStorage.setItem(key, value), [
    CHAOS_STORAGE_KEY,
    JSON.stringify(chaos),
  ] as const);
}

export const NO_CHAOS: ChaosConfig = { minLatencyMs: 0, maxLatencyMs: 0, failureRate: 0 };

/** Opens a URL and waits until the mock-API service worker is intercepting requests. */
export async function gotoReady(page: Page, url = '/') {
  await page.goto(url);
  await page.locator('html[data-mock-api="ready"]').waitFor({ state: 'attached' });
}
