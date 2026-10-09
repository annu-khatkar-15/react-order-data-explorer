import { useCallback, useEffect, useRef, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router';
import { orderKeys, useOrdersQuery } from '../../api/orders';
import { buttonClass } from '../../components/styles';
import { EmptyState, ErrorState, Spinner } from '../../components/ui';
import { formatCount } from '../../lib/format';
import type { SortDir, SortField } from '../../shared/orderQuery';
import { NetworkSimulator } from '../simulation/NetworkSimulator';
import { ActiveFilters } from './ActiveFilters';
import { countActiveFilters } from './filterChips';
import { FiltersPanel } from './FiltersPanel';
import { GridSkeleton, OrdersGrid } from './OrdersGrid';
import { Pagination } from './Pagination';
import { SearchBox } from './SearchBox';
import { StatsPanel } from './StatsPanel';
import { useOrderQueryParams } from './useOrderQueryParams';

/** First click on a column sorts in its most useful direction. */
const FIRST_SORT_DIR: Record<SortField, SortDir> = {
  createdAt: 'desc',
  totalCents: 'desc',
  itemCount: 'desc',
  id: 'asc',
  customerName: 'asc',
  status: 'asc',
  country: 'asc',
};

export default function ExplorerPage() {
  const { query, setQuery, resetFilters } = useOrderQueryParams();
  const list = useOrdersQuery(query);
  const navigate = useNavigate();
  const location = useLocation();
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Key of the result set actually on screen. During a refetch the old rows stay visible
  // (dimmed), so this only advances once the new query's own data has arrived.
  const currentKey = orderKeys.list(query)[2];
  const [shownKey, setShownKey] = useState(currentKey);
  if (list.data && !list.isPlaceholderData && shownKey !== currentKey) setShownKey(currentKey);

  // Kept in a ref so `openOrder` stays stable and memoised rows don't re-render per navigation.
  const searchRef = useRef(location.search);
  useEffect(() => {
    searchRef.current = location.search;
  });
  const openOrder = useCallback(
    (id: string) =>
      navigate(
        { pathname: `/orders/${encodeURIComponent(id)}`, search: searchRef.current },
        { state: { fromList: true } },
      ),
    [navigate],
  );

  const onSearch = useCallback((q: string) => setQuery({ q }), [setQuery]);
  const onSort = useCallback(
    (field: SortField) =>
      setQuery(
        field === query.sort
          ? { sort: field, dir: query.dir === 'asc' ? 'desc' : 'asc' }
          : { sort: field, dir: FIRST_SORT_DIR[field] },
      ),
    [query.sort, query.dir, setQuery],
  );

  const data = list.data;
  const stale = list.isPlaceholderData || (list.isError && !!data);
  const activeFilterCount = countActiveFilters(query);

  return (
    <div className="flex min-h-dvh flex-col bg-slate-50 lg:h-dvh">
      <a
        href="#results"
        className="sr-only z-50 rounded-md bg-white px-3 py-2 text-sm font-medium text-indigo-700 shadow focus:not-sr-only focus:absolute focus:top-2 focus:left-2"
      >
        Skip to results
      </a>

      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Order Explorer</h1>
            <p className="text-xs text-slate-600">
              Search, filter and sort 12,000 orders served by a deliberately unreliable mock API.
            </p>
          </div>
          <NetworkSimulator />
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[1600px] flex-1 gap-6 px-4 py-4 lg:min-h-0">
        <FiltersPanel
          id="filters"
          query={query}
          setQuery={setQuery}
          onReset={resetFilters}
          className={`${filtersOpen ? 'block' : 'hidden'} fixed inset-x-0 bottom-0 z-30 max-h-[70dvh] overflow-y-auto rounded-t-xl border-t border-slate-200 bg-white p-4 shadow-2xl lg:static lg:block lg:max-h-none lg:w-60 lg:shrink-0 lg:rounded-lg lg:border lg:shadow-none`}
        />

        <main className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex gap-2">
            <SearchBox value={query.q} onSearch={onSearch} />
            <button
              type="button"
              className={`${buttonClass.secondary} lg:hidden`}
              aria-expanded={filtersOpen}
              aria-controls="filters"
              onClick={() => setFiltersOpen((o) => !o)}
            >
              Filters
              {activeFilterCount ? (
                <span className="rounded-full bg-indigo-600 px-1.5 text-xs text-white">
                  {activeFilterCount}
                </span>
              ) : null}
            </button>
          </div>

          <ActiveFilters query={query} setQuery={setQuery} onClearAll={resetFilters} />

          <StatsPanel query={query} />

          <section
            id="results"
            tabIndex={-1}
            aria-labelledby="results-heading"
            className="flex h-[70dvh] min-h-[24rem] flex-col overflow-hidden rounded-lg border border-slate-200 bg-white lg:h-auto lg:min-h-0 lg:flex-1"
          >
            <div className="flex min-h-11 items-center justify-between gap-3 border-b border-slate-200 px-4 py-2">
              <h2 id="results-heading" className="sr-only">
                Results
              </h2>
              <ResultsStatus list={list} pageSize={query.pageSize} page={query.page} />
            </div>

            {list.isError && data ? (
              <div className="p-3">
                <ErrorState
                  compact
                  title="Couldn’t refresh these results"
                  message={`${list.error.message} The rows below may be out of date.`}
                  onRetry={() => void list.refetch()}
                  retrying={list.isFetching}
                />
              </div>
            ) : null}

            {list.isPending ? (
              <GridSkeleton />
            ) : list.isError && !data ? (
              <div className="flex flex-1 items-center justify-center p-6">
                <ErrorState
                  title="Couldn’t load orders"
                  message={list.error.message}
                  onRetry={() => void list.refetch()}
                  retrying={list.isFetching}
                />
              </div>
            ) : data && data.total === 0 ? (
              <div
                className={`flex flex-1 items-center justify-center ${stale ? 'opacity-50' : ''}`}
              >
                <EmptyState title="No orders match your search and filters">
                  <p className="text-sm">Try a different search term or remove some filters.</p>
                  <button type="button" className={buttonClass.secondary} onClick={resetFilters}>
                    Clear search and filters
                  </button>
                </EmptyState>
              </div>
            ) : data && data.items.length === 0 ? (
              <div className="flex flex-1 items-center justify-center">
                <EmptyState title={`Page ${formatCount(query.page)} doesn’t exist`}>
                  <p className="text-sm">
                    There are only {formatCount(data.pageCount)} pages of results.
                  </p>
                  <button
                    type="button"
                    className={buttonClass.secondary}
                    onClick={() => setQuery({ page: data.pageCount })}
                  >
                    Go to the last page
                  </button>
                </EmptyState>
              </div>
            ) : data ? (
              <OrdersGrid
                orders={data.items}
                viewKey={shownKey}
                sort={query.sort}
                dir={query.dir}
                onSort={onSort}
                onOpen={openOrder}
                stale={stale}
              />
            ) : null}

            {data && data.total > 0 ? (
              <Pagination
                page={query.page}
                pageCount={data.pageCount}
                pageSize={query.pageSize}
                total={data.total}
                onPage={(page) => setQuery({ page })}
                onPageSize={(pageSize) => setQuery({ pageSize })}
              />
            ) : null}
          </section>
        </main>
      </div>

      {/* Detail drawer route renders here, on top of the list, which stays mounted. */}
      <Outlet />
    </div>
  );
}

/**
 * Visible status line that is also a polite live region, so screen readers hear result
 * counts and loading progress. Errors are announced separately by role="alert".
 */
function ResultsStatus({
  list,
  page,
  pageSize,
}: {
  list: ReturnType<typeof useOrdersQuery>;
  page: number;
  pageSize: number;
}) {
  let message = '';
  let busy = false;
  if (list.isPending) {
    message = 'Loading orders…';
    busy = true;
  } else if (list.isPlaceholderData) {
    message = 'Updating results…';
    busy = true;
  } else if (list.data && !list.isError) {
    const { total, items } = list.data;
    if (total === 0) message = 'No matching orders';
    else if (items.length === 0)
      message = `${formatCount(total)} orders. This page is out of range.`;
    else {
      const first = (page - 1) * pageSize + 1;
      message = `Showing ${formatCount(first)}–${formatCount(first + items.length - 1)} of ${formatCount(total)} orders`;
    }
  }

  return (
    <p
      data-testid="results-status"
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="flex items-center gap-2 text-sm text-slate-700"
    >
      {busy ? <Spinner className="size-4 text-indigo-600" /> : null}
      <span className={busy ? 'font-medium text-indigo-700' : ''}>{message}</span>
    </p>
  );
}
