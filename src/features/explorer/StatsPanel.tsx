import { useOrderStatsQuery } from '../../api/orders';
import { STATUS_DOT } from '../../components/styles';
import { ErrorState } from '../../components/ui';
import { formatCount, formatMoney, STATUS_LABELS } from '../../lib/format';
import { ORDER_STATUSES } from '../../shared/order';
import type { OrderQuery } from '../../shared/orderQuery';

/**
 * Summary for the current filters, loaded by its own request. If it fails while the list
 * succeeds, the page is in a partial-failure state: this panel says so and offers a retry,
 * and the list below stays usable.
 */
export function StatsPanel({ query }: { query: OrderQuery }) {
  const stats = useOrderStatsQuery(query);

  if (stats.isError && !stats.data) {
    return (
      <ErrorState
        compact
        title="Summary unavailable"
        message={`${stats.error.message} The order list is not affected.`}
        onRetry={() => void stats.refetch()}
        retrying={stats.isFetching}
      />
    );
  }

  const data = stats.data;
  const stale = stats.isPlaceholderData || stats.isPending;

  return (
    <section
      aria-label="Summary"
      aria-busy={stale}
      className={`rounded-lg border border-slate-200 bg-white p-3 transition-opacity ${stale ? 'opacity-60' : ''}`}
    >
      <dl className="grid grid-cols-3 gap-3">
        <Metric label="Matching orders" value={data ? formatCount(data.count) : null} />
        <Metric label="Revenue" value={data ? formatMoney(data.revenueCents) : null} />
        <Metric label="Average order" value={data ? formatMoney(data.averageCents) : null} />
      </dl>
      {data && data.count > 0 ? (
        <div className="mt-3">
          <div className="flex h-2 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
            {ORDER_STATUSES.map((s) =>
              data.byStatus[s] ? (
                <div
                  key={s}
                  className={STATUS_DOT[s]}
                  style={{ width: `${(data.byStatus[s] / data.count) * 100}%` }}
                />
              ) : null,
            )}
          </div>
          <ul
            className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600"
            aria-label="Orders by status"
          >
            {ORDER_STATUSES.map((s) => (
              <li key={s} className="flex items-center gap-1.5">
                <span className={`size-2 rounded-full ${STATUS_DOT[s]}`} aria-hidden="true" />
                {STATUS_LABELS[s]}{' '}
                <span className="font-medium text-slate-900 tabular-nums">
                  {formatCount(data.byStatus[s])}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="min-w-0">
      <dt className="truncate text-xs text-slate-600">{label}</dt>
      <dd className="mt-0.5 truncate text-base font-semibold text-slate-900 tabular-nums sm:text-lg">
        {value ?? (
          <>
            <span
              className="inline-block h-5 w-20 animate-pulse rounded bg-slate-200 align-middle"
              aria-hidden="true"
            />
            <span className="sr-only">Loading</span>
          </>
        )}
      </dd>
    </div>
  );
}
