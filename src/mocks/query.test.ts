import { DEFAULT_QUERY, type OrderQuery } from '../shared/orderQuery';
import { getOrders } from './data';
import { computeStats, queryOrders } from './query';

const orders = getOrders();
const run = (q: Partial<OrderQuery>) => queryOrders(orders, { ...DEFAULT_QUERY, ...q });

describe('queryOrders', () => {
  it('paginates without gaps or overlaps', () => {
    const pageSize = 1000;
    const first = run({ pageSize });
    const ids = new Set<string>();
    for (let page = 1; page <= first.pageCount; page++) {
      for (const o of run({ page, pageSize }).items) ids.add(o.id);
    }
    expect(first.total).toBe(orders.length);
    expect(ids.size).toBe(orders.length);
  });

  it('returns an empty page (not an error) past the end', () => {
    const res = run({ page: 9999 });
    expect(res.items).toEqual([]);
    expect(res.total).toBe(orders.length);
  });

  it('searches across id, name and email, ignoring case and accents', () => {
    const muller = run({ q: 'MULLER', pageSize: 1000 });
    expect(muller.total).toBeGreaterThan(0);
    expect(muller.items.every((o) => o.customerName.includes('Müller'))).toBe(true);

    expect(run({ q: 'ord-100001' }).items.map((o) => o.id)).toEqual(['ORD-100001']);
  });

  it('requires every search term to match', () => {
    const res = run({ q: 'olivia smith', pageSize: 1000 });
    expect(res.total).toBeGreaterThan(0);
    expect(
      res.items.every((o) => /olivia/i.test(o.customerName) && /smith/i.test(o.customerName)),
    ).toBe(true);
  });

  it('combines filters with AND', () => {
    const res = run({
      status: ['shipped', 'pending'],
      country: ['DE'],
      minTotal: 50,
      maxTotal: 200,
      from: '2025-01-01',
      to: '2025-06-30',
      pageSize: 1000,
    });
    expect(res.total).toBeGreaterThan(0);
    for (const o of res.items) {
      expect(['shipped', 'pending']).toContain(o.status);
      expect(o.country).toBe('DE');
      expect(o.totalCents).toBeGreaterThanOrEqual(5000);
      expect(o.totalCents).toBeLessThanOrEqual(20000);
      expect(o.createdAt >= '2025-01-01' && o.createdAt <= '2025-06-30T23:59:59.999Z').toBe(true);
    }
  });

  it('sorts in both directions with a stable id tie-break', () => {
    const asc = run({ sort: 'status', dir: 'asc', pageSize: 1000 }).items;
    for (let i = 1; i < asc.length; i++) {
      const [a, b] = [asc[i - 1]!, asc[i]!];
      expect(a.status < b.status || (a.status === b.status && a.id < b.id)).toBe(true);
    }
    const desc = run({ sort: 'totalCents', dir: 'desc', pageSize: 100 }).items;
    for (let i = 1; i < desc.length; i++) {
      expect(desc[i - 1]!.totalCents).toBeGreaterThanOrEqual(desc[i]!.totalCents);
    }
  });

  it('does not leak detail-only fields into list rows', () => {
    expect(run({ pageSize: 25 }).items[0]).not.toHaveProperty('lineItems');
  });
});

describe('computeStats', () => {
  it('aggregates the filtered set, ignoring pagination', () => {
    const stats = computeStats(orders, {
      ...DEFAULT_QUERY,
      country: ['JP'],
      page: 5,
      pageSize: 25,
    });
    const jp = orders.filter((o) => o.country === 'JP');
    expect(stats.count).toBe(jp.length);
    expect(stats.revenueCents).toBe(jp.reduce((s, o) => s + o.totalCents, 0));
    expect(Object.values(stats.byStatus).reduce((a, b) => a + b, 0)).toBe(jp.length);
  });
});
