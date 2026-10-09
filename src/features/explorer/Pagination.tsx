import { useId } from 'react';
import { formatCount } from '../../lib/format';
import { PAGE_SIZES, type PageSize } from '../../shared/orderQuery';
import { pageWindow } from './pageWindow';

interface Props {
  page: number;
  pageCount: number;
  pageSize: PageSize;
  total: number;
  onPage: (page: number) => void;
  onPageSize: (size: PageSize) => void;
}

const pageBtn =
  'inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-sm tabular-nums text-slate-700 hover:bg-slate-100 disabled:pointer-events-none disabled:opacity-40';

export function Pagination({ page, pageCount, pageSize, total, onPage, onPageSize }: Props) {
  const sizeId = useId();
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(total, page * pageSize);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-2">
      <div className="flex items-center gap-3 text-sm text-slate-600">
        <span className="tabular-nums">
          {formatCount(first)}–{formatCount(last)} of {formatCount(total)}
        </span>
        <span className="hidden h-4 w-px bg-slate-300 sm:block" aria-hidden="true" />
        <label htmlFor={sizeId} className="sr-only sm:not-sr-only">
          Rows per page
        </label>
        <select
          id={sizeId}
          value={pageSize}
          onChange={(e) => onPageSize(Number(e.target.value) as PageSize)}
          className="rounded-md border-0 bg-white py-1 pr-7 pl-2 text-sm ring-1 ring-slate-300 ring-inset"
        >
          {PAGE_SIZES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <nav aria-label="Pagination">
        <ul className="flex items-center gap-1">
          <li>
            <button
              type="button"
              className={pageBtn}
              onClick={() => onPage(page - 1)}
              disabled={page <= 1}
            >
              <span aria-hidden="true">‹</span>
              <span className="ml-1 hidden sm:inline">Previous</span>
              <span className="sr-only sm:hidden">Previous page</span>
            </button>
          </li>
          {pageWindow(page, pageCount).map((p, i) =>
            p === 'gap' ? (
              <li key={`gap-${i}`} className="px-1 text-slate-400" aria-hidden="true">
                …
              </li>
            ) : (
              <li key={p}>
                <button
                  type="button"
                  onClick={() => onPage(p)}
                  aria-label={`Page ${p}`}
                  aria-current={p === page ? 'page' : undefined}
                  className={`${pageBtn} ${p === page ? 'bg-indigo-600 font-semibold text-white hover:bg-indigo-600' : ''}`}
                >
                  {formatCount(p)}
                </button>
              </li>
            ),
          )}
          <li>
            <button
              type="button"
              className={pageBtn}
              onClick={() => onPage(page + 1)}
              disabled={page >= pageCount}
            >
              <span className="mr-1 hidden sm:inline">Next</span>
              <span className="sr-only sm:hidden">Next page</span>
              <span aria-hidden="true">›</span>
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
}
