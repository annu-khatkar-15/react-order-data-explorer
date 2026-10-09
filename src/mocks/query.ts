import {
  ORDER_STATUSES,
  type Order,
  type OrderPage,
  type OrderStats,
  type OrderSummary,
} from '../shared/order';
import type { OrderQuery } from '../shared/orderQuery';

// Pure "database" logic for the mock API, kept free of MSW so it can be unit-tested directly.

/** Lowercase, accent-free text so "muller" finds "Müller". */
export const normalizeText = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

const searchIndex = new WeakMap<Order, string>();
const searchTextOf = (o: Order) => {
  let text = searchIndex.get(o);
  if (text === undefined) {
    text = normalizeText(`${o.id} ${o.customerName} ${o.email}`);
    searchIndex.set(o, text);
  }
  return text;
};

type Filters = Omit<OrderQuery, 'sort' | 'dir' | 'page' | 'pageSize'>;

export function filterOrders(orders: Order[], f: Filters): Order[] {
  const terms = normalizeText(f.q).split(/\s+/).filter(Boolean);
  const status = f.status.length ? new Set<string>(f.status) : null;
  const country = f.country.length ? new Set<string>(f.country) : null;
  const payment = f.payment.length ? new Set<string>(f.payment) : null;
  const minCents = f.minTotal !== undefined ? Math.round(f.minTotal * 100) : -Infinity;
  const maxCents = f.maxTotal !== undefined ? Math.round(f.maxTotal * 100) : Infinity;
  // Dates are whole UTC days, both ends inclusive.
  const fromIso = f.from ? `${f.from}T00:00:00.000Z` : '';
  const toIso = f.to ? `${f.to}T23:59:59.999Z` : '';

  return orders.filter((o) => {
    if (status && !status.has(o.status)) return false;
    if (country && !country.has(o.country)) return false;
    if (payment && !payment.has(o.paymentMethod)) return false;
    if (o.totalCents < minCents || o.totalCents > maxCents) return false;
    if (fromIso && o.createdAt < fromIso) return false;
    if (toIso && o.createdAt > toIso) return false;
    if (terms.length) {
      const text = searchTextOf(o);
      if (!terms.every((t) => text.includes(t))) return false;
    }
    return true;
  });
}

export function sortOrders(orders: Order[], sort: OrderQuery['sort'], dir: OrderQuery['dir']) {
  const sign = dir === 'asc' ? 1 : -1;
  return [...orders].sort((a, b) => {
    const av = a[sort];
    const bv = b[sort];
    const primary =
      typeof av === 'number' && typeof bv === 'number'
        ? av - bv
        : String(av).localeCompare(String(bv));
    // IDs are unique, so this tie-break makes the order total and stable across pages.
    return sign * (primary || a.id.localeCompare(b.id));
  });
}

export const toSummary = ({
  lineItems: _lineItems,
  shippingAddress: _shippingAddress,
  shippingCents: _shippingCents,
  ...summary
}: Order): OrderSummary => summary;

export function queryOrders(orders: Order[], query: OrderQuery): OrderPage {
  const matched = sortOrders(filterOrders(orders, query), query.sort, query.dir);
  const start = (query.page - 1) * query.pageSize;
  return {
    // A page past the end returns no items, and the client decides how to show that.
    items: matched.slice(start, start + query.pageSize).map(toSummary),
    total: matched.length,
    page: query.page,
    pageSize: query.pageSize,
    pageCount: Math.max(1, Math.ceil(matched.length / query.pageSize)),
  };
}

export function computeStats(orders: Order[], query: OrderQuery): OrderStats {
  const matched = filterOrders(orders, query);
  const byStatus = Object.fromEntries(ORDER_STATUSES.map((s) => [s, 0])) as OrderStats['byStatus'];
  let revenueCents = 0;
  for (const o of matched) {
    byStatus[o.status] += 1;
    revenueCents += o.totalCents;
  }
  return {
    count: matched.length,
    revenueCents,
    averageCents: matched.length ? Math.round(revenueCents / matched.length) : 0,
    byStatus,
  };
}
