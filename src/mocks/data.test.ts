import { generateOrders, getOrders, ORDER_COUNT } from './data';

describe('mock dataset', () => {
  const orders = getOrders();

  it('has at least 10,000 orders with unique IDs', () => {
    expect(orders.length).toBe(ORDER_COUNT);
    expect(ORDER_COUNT).toBeGreaterThanOrEqual(10_000);
    expect(new Set(orders.map((o) => o.id)).size).toBe(orders.length);
  });

  it('is deterministic for a given seed', () => {
    expect(generateOrders(50, 7)).toEqual(generateOrders(50, 7));
    expect(generateOrders(50, 7)).not.toEqual(generateOrders(50, 8));
  });

  it('has internally consistent totals and ASCII emails', () => {
    for (const o of orders.slice(0, 500)) {
      const subtotal = o.lineItems.reduce((s, li) => s + li.quantity * li.unitPriceCents, 0);
      expect(o.totalCents).toBe(subtotal + o.shippingCents);
      expect(o.itemCount).toBe(o.lineItems.reduce((s, li) => s + li.quantity, 0));
      expect(o.email).toMatch(/^[a-z0-9.]+@[a-z.]+$/);
    }
  });
});
