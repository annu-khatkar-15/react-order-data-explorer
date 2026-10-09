import { z } from 'zod';
import { COUNTRY_CODES, ORDER_STATUSES, PAYMENT_METHODS } from './order';

// One query format for both the browser URL and the API request.
// Parsing is lenient: anything invalid falls back to its default instead of
// throwing, so a hand-edited or outdated link still opens a sensible view.

export const SORT_FIELDS = [
  'createdAt',
  'id',
  'customerName',
  'status',
  'totalCents',
  'itemCount',
  'country',
] as const;
export type SortField = (typeof SORT_FIELDS)[number];
export type SortDir = 'asc' | 'desc';

export const PAGE_SIZES = [25, 50, 100, 250, 500, 1000] as const;
export type PageSize = (typeof PAGE_SIZES)[number];

/** Comma-separated multi-select. Unknown values are dropped, duplicates removed. */
const csvOf = <T extends string>(allowed: readonly T[]) => {
  const allowedSet = new Set<string>(allowed);
  return z
    .string()
    .optional()
    .transform((raw): T[] =>
      raw ? [...new Set(raw.split(','))].filter((v): v is T => allowedSet.has(v)) : [],
    )
    .catch([]);
};

const emptyToUndefined = (v: unknown) => (v === '' || v == null ? undefined : v);

const optionalAmount = z
  .preprocess(emptyToUndefined, z.coerce.number().finite().nonnegative().optional())
  .catch(undefined);

const optionalDate = z.preprocess(emptyToUndefined, z.iso.date().optional()).catch(undefined);

export const orderQuerySchema = z.object({
  q: z
    .string()
    .optional()
    .transform((v) => (v ?? '').slice(0, 200))
    .catch(''),
  status: csvOf(ORDER_STATUSES),
  country: csvOf(COUNTRY_CODES),
  payment: csvOf(PAYMENT_METHODS),
  /** Whole currency units (dollars), not cents, so URLs stay readable. */
  minTotal: optionalAmount,
  maxTotal: optionalAmount,
  from: optionalDate,
  to: optionalDate,
  sort: z.enum(SORT_FIELDS).catch('createdAt'),
  dir: z.enum(['asc', 'desc']).catch('desc'),
  page: z.coerce.number().int().min(1).catch(1),
  pageSize: z.coerce
    .number()
    .refine((n): n is PageSize => (PAGE_SIZES as readonly number[]).includes(n))
    .catch(100),
});

export type OrderQuery = z.output<typeof orderQuerySchema>;

export const DEFAULT_QUERY: OrderQuery = orderQuerySchema.parse({});

export function parseOrderQuery(params: URLSearchParams): OrderQuery {
  return orderQuerySchema.parse(Object.fromEntries(params));
}

/**
 * Serialises a query, omitting defaults, in a fixed key order. The output is
 * canonical: equal queries always produce the same string.
 */
export function serializeOrderQuery(query: OrderQuery): URLSearchParams {
  const out = new URLSearchParams();
  const q = query.q.trim();
  if (q) out.set('q', q);
  if (query.status.length) out.set('status', [...query.status].sort().join(','));
  if (query.country.length) out.set('country', [...query.country].sort().join(','));
  if (query.payment.length) out.set('payment', [...query.payment].sort().join(','));
  if (query.minTotal !== undefined) out.set('minTotal', String(query.minTotal));
  if (query.maxTotal !== undefined) out.set('maxTotal', String(query.maxTotal));
  if (query.from) out.set('from', query.from);
  if (query.to) out.set('to', query.to);
  if (query.sort !== DEFAULT_QUERY.sort) out.set('sort', query.sort);
  if (query.dir !== DEFAULT_QUERY.dir) out.set('dir', query.dir);
  if (query.page !== DEFAULT_QUERY.page) out.set('page', String(query.page));
  if (query.pageSize !== DEFAULT_QUERY.pageSize) out.set('pageSize', String(query.pageSize));
  return out;
}
