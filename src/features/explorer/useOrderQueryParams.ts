import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router';
import {
  DEFAULT_QUERY,
  parseOrderQuery,
  serializeOrderQuery,
  type OrderQuery,
} from '../../shared/orderQuery';

/**
 * The URL is the single source of truth for the view. Search, filters, sort, page and page
 * size are read from it and written back to it. There is no copy in React state that could
 * drift, so refresh, back/forward and shared links all restore the same view.
 *
 * Every change is a history push, so Back undoes it. Typing is debounced before it gets
 * here, which keeps keystrokes from flooding the history.
 */
export function useOrderQueryParams() {
  const [searchParams, setSearchParams] = useSearchParams();
  const raw = searchParams.toString();
  const query = useMemo(() => parseOrderQuery(new URLSearchParams(raw)), [raw]);

  const latestRaw = useRef(raw);
  useEffect(() => {
    latestRaw.current = raw;
  }, [raw]);

  const write = useCallback(
    (next: OrderQuery, replace = false) => {
      const nextRaw = serializeOrderQuery(next).toString();
      if (nextRaw === latestRaw.current) return; // a no-op change must not add a history entry
      latestRaw.current = nextRaw;
      setSearchParams(nextRaw, { replace, preventScrollReset: true });
    },
    [setSearchParams],
  );

  /** Merges a change into the current query. Any change other than `page` returns to page 1. */
  const setQuery = useCallback(
    (patch: Partial<OrderQuery>) => {
      const current = parseOrderQuery(new URLSearchParams(latestRaw.current));
      const resetsPage = Object.keys(patch).some((k) => k !== 'page');
      write({ ...current, ...(resetsPage ? { page: 1 } : null), ...patch });
    },
    [write],
  );

  /** Clears search and filters, keeping sort and page size. */
  const resetFilters = useCallback(() => {
    const current = parseOrderQuery(new URLSearchParams(latestRaw.current));
    write({ ...DEFAULT_QUERY, sort: current.sort, dir: current.dir, pageSize: current.pageSize });
  }, [write]);

  // Canonicalise hand-edited or outdated links (invalid values, odd ordering) in place, so
  // the address bar always shows exactly the view on screen.
  useEffect(() => {
    const canonical = serializeOrderQuery(query).toString();
    if (canonical !== raw) write(query, true);
  }, [query, raw, write]);

  return { query, setQuery, resetFilters };
}

export type SetQuery = ReturnType<typeof useOrderQueryParams>['setQuery'];
