import { delay, http, HttpResponse } from 'msw';
import type { ApiErrorBody } from '../shared/order';
import { parseOrderQuery } from '../shared/orderQuery';
import { nextLatency, shouldFail } from './chaos';
import { getOrders } from './data';
import { computeStats, queryOrders } from './query';

/** Waits a random latency, then returns a 5xx error response if this request is chosen to fail. */
async function simulateNetwork(): Promise<HttpResponse<ApiErrorBody> | undefined> {
  await delay(nextLatency());
  if (shouldFail()) {
    const status = Math.random() < 0.5 ? 500 : 503;
    return HttpResponse.json(
      { message: status === 503 ? 'Service temporarily unavailable' : 'Internal server error' },
      { status },
    );
  }
  return undefined;
}

// Relative paths match the page's own origin. That is what the browser worker needs; in
// tests jsdom provides `location`. `/stats` is registered before `/:id` so it is not
// treated as an order ID.
export const handlers = [
  http.get('/api/orders', async ({ request }) => {
    const failure = await simulateNetwork();
    if (failure) return failure;
    const query = parseOrderQuery(new URL(request.url).searchParams);
    return HttpResponse.json(queryOrders(getOrders(), query));
  }),

  http.get('/api/orders/stats', async ({ request }) => {
    const failure = await simulateNetwork();
    if (failure) return failure;
    const query = parseOrderQuery(new URL(request.url).searchParams);
    return HttpResponse.json(computeStats(getOrders(), query));
  }),

  http.get<{ id: string }>('/api/orders/:id', async ({ params }) => {
    const failure = await simulateNetwork();
    if (failure) return failure;
    const order = getOrders().find((o) => o.id === params.id);
    return order
      ? HttpResponse.json(order)
      : HttpResponse.json<ApiErrorBody>(
          { message: `Order ${params.id} not found` },
          { status: 404 },
        );
  }),
];
