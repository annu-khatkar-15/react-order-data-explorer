import type { OrderPage, OrderStats } from '../shared/order';
import { DEFAULT_CHAOS, setChaos, setChaosRandom } from './chaos';

const api = (path: string) => fetch(new URL(path, location.origin));

// The MSW server lifecycle and chaos reset live in src/test/setup.ts.

describe('mock API handlers', () => {
  it('serves filtered, sorted, paginated orders', async () => {
    const res = await api('/api/orders?status=refunded&sort=totalCents&dir=asc&pageSize=25&page=2');
    expect(res.status).toBe(200);
    const body = (await res.json()) as OrderPage;
    expect(body.page).toBe(2);
    expect(body.items).toHaveLength(25);
    expect(body.items.every((o) => o.status === 'refunded')).toBe(true);
  });

  it('routes /stats to stats, not to the :id handler', async () => {
    const body = (await (await api('/api/orders/stats?country=SE')).json()) as OrderStats;
    expect(body.count).toBeGreaterThan(0);
    expect(body.byStatus).toBeDefined();
  });

  it('serves a single order and 404s for an unknown one', async () => {
    const ok = await api('/api/orders/ORD-100042');
    expect(ok.status).toBe(200);
    expect((await ok.json()).lineItems.length).toBeGreaterThan(0);

    const missing = await api('/api/orders/ORD-1');
    expect(missing.status).toBe(404);
    expect((await missing.json()).message).toMatch(/not found/);
  });

  it('fails with a 5xx JSON error when chaos says so', async () => {
    setChaos({ failureRate: 1 });
    const res = await api('/api/orders');
    expect([500, 503]).toContain(res.status);
    expect((await res.json()).message).toEqual(expect.any(String));
  });

  it('waits a latency drawn from the configured range', async () => {
    setChaos({ minLatencyMs: 200, maxLatencyMs: 3000 });
    setChaosRandom(() => 0); // lowest possible latency
    const started = performance.now();
    await api('/api/orders?pageSize=25');
    expect(performance.now() - started).toBeGreaterThanOrEqual(190);
  });
});

describe('default chaos', () => {
  it('fails roughly 1 in 10 requests by default', async () => {
    expect(DEFAULT_CHAOS).toEqual({ minLatencyMs: 200, maxLatencyMs: 3000, failureRate: 0.1 });
    setChaos({ minLatencyMs: 0, maxLatencyMs: 0, failureRate: DEFAULT_CHAOS.failureRate });
    const results = await Promise.all(
      Array.from({ length: 300 }, () => api('/api/orders?pageSize=25')),
    );
    const failed = results.filter((r) => !r.ok).length;
    // Expected 30; these bounds make a false failure astronomically unlikely.
    expect(failed).toBeGreaterThan(10);
    expect(failed).toBeLessThan(60);
  });
});
