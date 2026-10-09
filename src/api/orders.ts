import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { Order, OrderPage, OrderStats } from '../shared/order';
import { DEFAULT_QUERY, serializeOrderQuery, type OrderQuery } from '../shared/orderQuery';
import { getJson } from './client';

// Query keys contain the canonical query string, so every distinct view gets its own cache
// entry. A response is only ever stored under the key of the request that produced it, which
// is what makes "a slow old response overwrites the new one" impossible by construction.

/** Stats depend only on the filters, not on sort or pagination. */
const statsQueryOf = (q: OrderQuery): OrderQuery => ({
  ...q,
  sort: DEFAULT_QUERY.sort,
  dir: DEFAULT_QUERY.dir,
  page: DEFAULT_QUERY.page,
  pageSize: DEFAULT_QUERY.pageSize,
});

export const orderKeys = {
  all: ['orders'] as const,
  lists: () => [...orderKeys.all, 'list'] as const,
  list: (q: OrderQuery) => [...orderKeys.lists(), serializeOrderQuery(q).toString()] as const,
  stats: (q: OrderQuery) =>
    [...orderKeys.all, 'stats', serializeOrderQuery(statsQueryOf(q)).toString()] as const,
  detail: (id: string) => [...orderKeys.all, 'detail', id] as const,
};

export const fetchOrders = (q: OrderQuery, signal?: AbortSignal) =>
  getJson<OrderPage>(`/api/orders?${serializeOrderQuery(q)}`, signal);

export const fetchOrderStats = (q: OrderQuery, signal?: AbortSignal) =>
  getJson<OrderStats>(`/api/orders/stats?${serializeOrderQuery(statsQueryOf(q))}`, signal);

export const fetchOrder = (id: string, signal?: AbortSignal) =>
  getJson<Order>(`/api/orders/${encodeURIComponent(id)}`, signal);

/**
 * The current page of orders. While a new query loads, the previous page stays available
 * as `placeholderData`. The UI must render it as visibly out of date (`isPlaceholderData`).
 * TanStack Query passes an AbortSignal that fires when the key changes, so superseded
 * requests are cancelled at the network level as well as ignored.
 */
export function useOrdersQuery(q: OrderQuery) {
  return useQuery({
    queryKey: orderKeys.list(q),
    queryFn: ({ signal }) => fetchOrders(q, signal),
    placeholderData: keepPreviousData,
  });
}

export function useOrderStatsQuery(q: OrderQuery) {
  return useQuery({
    queryKey: orderKeys.stats(q),
    queryFn: ({ signal }) => fetchOrderStats(q, signal),
    placeholderData: keepPreviousData,
  });
}

export function useOrderQuery(id: string) {
  return useQuery({
    queryKey: orderKeys.detail(id),
    queryFn: ({ signal }) => fetchOrder(id, signal),
  });
}
