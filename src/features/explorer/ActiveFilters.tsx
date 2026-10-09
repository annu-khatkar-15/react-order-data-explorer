import { buttonClass } from '../../components/styles';
import type { OrderQuery } from '../../shared/orderQuery';
import { chipsFor } from './filterChips';
import type { SetQuery } from './useOrderQueryParams';

export function ActiveFilters({
  query,
  setQuery,
  onClearAll,
}: {
  query: OrderQuery;
  setQuery: SetQuery;
  onClearAll: () => void;
}) {
  const chips = chipsFor(query);
  if (!chips.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Active filters" role="group">
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={() => setQuery(chip.remove)}
          className="inline-flex items-center gap-1 rounded-full bg-indigo-50 py-0.5 pr-1.5 pl-2.5 text-xs font-medium text-indigo-900 ring-1 ring-indigo-200 ring-inset hover:bg-indigo-100"
          aria-label={`Remove filter ${chip.label}`}
        >
          {chip.label}
          <svg className="size-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path d="M6.3 5.3a1 1 0 0 0-1.4 1.4L8.6 10l-3.7 3.3a1 1 0 1 0 1.4 1.4L10 11.4l3.3 3.3a1 1 0 0 0 1.4-1.4L11.4 10l3.3-3.3a1 1 0 0 0-1.4-1.4L10 8.6 6.3 5.3Z" />
          </svg>
        </button>
      ))}
      <button type="button" className={buttonClass.ghost} onClick={onClearAll}>
        Clear all
      </button>
    </div>
  );
}
