import { defaultRangeExtractor, useVirtualizer, type Range } from '@tanstack/react-virtual';
import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from 'react';
import { StatusBadge } from '../../components/ui';
import { formatDate, formatMoney, PAYMENT_LABELS } from '../../lib/format';
import { COUNTRIES, type OrderSummary } from '../../shared/order';
import type { SortDir, SortField } from '../../shared/orderQuery';

export const ROW_HEIGHT = 52;
const HEADER_HEIGHT = 44;

/** Shared by header and rows so columns always line up. */
const GRID_TEMPLATE =
  'grid grid-cols-[8rem_7.5rem_minmax(13rem,1.6fr)_7.5rem_minmax(8rem,1fr)_7.5rem_4.5rem_7.5rem] items-center gap-x-3 px-4';

interface Column {
  label: string;
  sort?: SortField;
  align?: 'right';
}

const COLUMNS: Column[] = [
  { label: 'Order', sort: 'id' },
  { label: 'Date', sort: 'createdAt' },
  { label: 'Customer', sort: 'customerName' },
  { label: 'Status', sort: 'status' },
  { label: 'Country', sort: 'country' },
  { label: 'Payment' },
  { label: 'Items', sort: 'itemCount', align: 'right' },
  { label: 'Total', sort: 'totalCents', align: 'right' },
];

// Scroll position per result set, in sessionStorage so it survives refresh and Back/Forward
// within the tab.
const SCROLL_PREFIX = 'order-explorer:scroll:';
function readScroll(key: string): number {
  try {
    return Number(sessionStorage.getItem(SCROLL_PREFIX + key)) || 0;
  } catch {
    return 0;
  }
}
function writeScroll(key: string, top: number) {
  try {
    sessionStorage.setItem(SCROLL_PREFIX + key, String(Math.round(top)));
  } catch {
    // Storage unavailable: scroll restoration is a nicety, not a requirement for correctness.
  }
}

interface Props {
  orders: OrderSummary[];
  /** Identifies the result set on screen. A new key resets scroll and keyboard position. */
  viewKey: string;
  sort: SortField;
  dir: SortDir;
  onSort: (field: SortField) => void;
  onOpen: (id: string) => void;
  /** The rows belong to a previous query while a new one loads. */
  stale: boolean;
}

/**
 * Virtualized ARIA grid. Only the rows in view (plus overscan) are in the DOM, so a
 * 1,000-row page scrolls as smoothly as a 25-row one.
 *
 * Keyboard: one Tab stop on the active row (roving tabindex); ↑/↓, Page Up/Down and
 * Home/End move between rows; Enter or Space opens the order. The active row is always
 * kept rendered (see rangeExtractor), so the Tab stop never disappears when the user
 * scrolls it out of view with the mouse.
 */
export function OrdersGrid({ orders, viewKey, sort, dir, onSort, onOpen, stale }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState({ key: viewKey, index: 0 });
  const activeIndex = active.key === viewKey ? Math.min(active.index, orders.length - 1) : 0;
  const pendingFocus = useRef<number | null>(null);

  const rangeExtractor = useCallback(
    (range: Range) => {
      const indexes = defaultRangeExtractor(range);
      if (activeIndex >= 0 && !indexes.includes(activeIndex)) {
        indexes.push(activeIndex);
        indexes.sort((a, b) => a - b);
      }
      return indexes;
    },
    [activeIndex],
  );

  // This project does not use the React Compiler, so its memoisation warning does not apply.
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: orders.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 8,
    scrollMargin: HEADER_HEIGHT,
    scrollPaddingStart: HEADER_HEIGHT,
    getItemKey: (i) => orders[i]?.id ?? i,
    rangeExtractor,
  });

  // A new result set starts where the user last left it (or at the top).
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = readScroll(viewKey);
  }, [viewKey]);

  const saveFrame = useRef(0);
  const onScroll = () => {
    cancelAnimationFrame(saveFrame.current);
    saveFrame.current = requestAnimationFrame(() => {
      if (scrollRef.current) writeScroll(viewKey, scrollRef.current.scrollTop);
    });
  };

  // Move DOM focus once the target row has rendered.
  useEffect(() => {
    if (pendingFocus.current === null) return;
    const row = scrollRef.current?.querySelector<HTMLElement>(
      `[role="row"][data-index="${pendingFocus.current}"]`,
    );
    if (row) {
      row.focus({ preventScroll: true });
      pendingFocus.current = null;
    }
  });

  const moveTo = (index: number) => {
    const next = Math.max(0, Math.min(orders.length - 1, index));
    setActive({ key: viewKey, index: next });
    pendingFocus.current = next;
    virtualizer.scrollToIndex(next, { align: 'auto' });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const row = e.target as HTMLElement;
    if (row.getAttribute('role') !== 'row' || row.dataset.index === undefined) return;
    const index = Number(row.dataset.index);
    const pageRows = Math.max(
      1,
      Math.floor(((scrollRef.current?.clientHeight ?? 0) - HEADER_HEIGHT) / ROW_HEIGHT) - 1,
    );
    switch (e.key) {
      case 'ArrowDown':
        moveTo(index + 1);
        break;
      case 'ArrowUp':
        moveTo(index - 1);
        break;
      case 'PageDown':
        moveTo(index + pageRows);
        break;
      case 'PageUp':
        moveTo(index - pageRows);
        break;
      case 'Home':
        moveTo(0);
        break;
      case 'End':
        moveTo(orders.length - 1);
        break;
      case 'Enter':
      case ' ': {
        const order = orders[index];
        if (order) onOpen(order.id);
        break;
      }
      default:
        return;
    }
    e.preventDefault();
  };

  const onRowFocus = useCallback(
    (index: number) =>
      setActive((prev) =>
        prev.key === viewKey && prev.index === index ? prev : { key: viewKey, index },
      ),
    [viewKey],
  );

  return (
    <div
      ref={scrollRef}
      role="grid"
      aria-label="Orders"
      aria-rowcount={orders.length + 1}
      aria-colcount={COLUMNS.length}
      aria-busy={stale}
      onKeyDown={onKeyDown}
      onScroll={onScroll}
      className="relative min-h-0 flex-1 overflow-auto overscroll-contain"
      data-testid="orders-grid"
    >
      <div
        role="rowgroup"
        className="sticky top-0 z-10 min-w-[64rem] border-b border-slate-200 bg-slate-50"
      >
        <div
          role="row"
          aria-rowindex={1}
          className={GRID_TEMPLATE}
          style={{ height: HEADER_HEIGHT }}
        >
          {COLUMNS.map((col) => (
            <HeaderCell key={col.label} column={col} sort={sort} dir={dir} onSort={onSort} />
          ))}
        </div>
      </div>
      <div
        role="rowgroup"
        // Rows from a superseded query are visible but cannot be acted on.
        inert={stale}
        className={`relative min-w-[64rem] transition-opacity ${stale ? 'opacity-50' : ''}`}
        style={{ height: virtualizer.getTotalSize() }}
      >
        {virtualizer.getVirtualItems().map((item) => {
          const order = orders[item.index];
          if (!order) return null;
          return (
            <OrderRow
              key={order.id}
              order={order}
              index={item.index}
              top={item.start - HEADER_HEIGHT}
              isActive={item.index === activeIndex}
              onOpen={onOpen}
              onFocusRow={onRowFocus}
            />
          );
        })}
      </div>
    </div>
  );
}

function HeaderCell({
  column,
  sort,
  dir,
  onSort,
}: {
  column: Column;
  sort: SortField;
  dir: SortDir;
  onSort: (field: SortField) => void;
}) {
  const isSorted = column.sort !== undefined && column.sort === sort;
  const align = column.align === 'right' ? 'justify-end text-right' : '';
  return (
    <div
      role="columnheader"
      aria-sort={isSorted ? (dir === 'asc' ? 'ascending' : 'descending') : undefined}
      className={`flex text-xs font-semibold tracking-wide text-slate-600 uppercase ${align}`}
    >
      {column.sort ? (
        <button
          type="button"
          onClick={() => onSort(column.sort!)}
          className={`-mx-1 inline-flex items-center gap-1 rounded px-1 py-1 uppercase hover:text-slate-900 ${isSorted ? 'text-indigo-700' : ''}`}
        >
          {column.label}
          <SortIcon state={isSorted ? dir : null} />
        </button>
      ) : (
        column.label
      )}
    </div>
  );
}

function SortIcon({ state }: { state: SortDir | null }) {
  return (
    <svg className="size-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M10 3 6 8h8l-4-5Z" opacity={state === 'asc' ? 1 : 0.3} />
      <path d="m10 17 4-5H6l4 5Z" opacity={state === 'desc' ? 1 : 0.3} />
    </svg>
  );
}

interface RowProps {
  order: OrderSummary;
  index: number;
  top: number;
  isActive: boolean;
  onOpen: (id: string) => void;
  onFocusRow: (index: number) => void;
}

/** Memoised: scrolling and focus changes only re-render rows whose props actually changed. */
const OrderRow = memo(function OrderRow({
  order,
  index,
  top,
  isActive,
  onOpen,
  onFocusRow,
}: RowProps) {
  const style: CSSProperties = { height: ROW_HEIGHT, transform: `translateY(${top}px)` };
  return (
    <div
      role="row"
      aria-rowindex={index + 2}
      data-index={index}
      data-order-id={order.id}
      tabIndex={isActive ? 0 : -1}
      onClick={() => onOpen(order.id)}
      onFocus={() => onFocusRow(index)}
      style={style}
      className={`${GRID_TEMPLATE} absolute top-0 left-0 w-full cursor-pointer border-b border-slate-100 text-sm text-slate-800 hover:bg-indigo-50/60 focus-visible:bg-indigo-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-indigo-600`}
    >
      <div role="gridcell" className="font-mono text-xs font-medium text-indigo-700">
        {order.id}
      </div>
      <div role="gridcell" className="text-slate-600 tabular-nums">
        {formatDate(order.createdAt)}
      </div>
      <div role="gridcell" className="min-w-0">
        <div className="truncate font-medium text-slate-900">{order.customerName}</div>
        <div className="truncate text-xs text-slate-500">{order.email}</div>
      </div>
      <div role="gridcell">
        <StatusBadge status={order.status} />
      </div>
      <div role="gridcell" className="truncate">
        <span className="mr-1.5 font-mono text-xs text-slate-500">{order.country}</span>
        {COUNTRIES[order.country]}
      </div>
      <div role="gridcell" className="truncate">
        {PAYMENT_LABELS[order.paymentMethod]}
      </div>
      <div role="gridcell" className="text-right tabular-nums">
        {order.itemCount}
      </div>
      <div role="gridcell" className="text-right font-medium text-slate-900 tabular-nums">
        {formatMoney(order.totalCents)}
      </div>
    </div>
  );
});

export function GridSkeleton() {
  return (
    <div className="flex-1 overflow-hidden" aria-hidden="true">
      <div className="h-11 border-b border-slate-200 bg-slate-50" />
      {Array.from({ length: 10 }, (_, i) => (
        <div key={i} className="flex h-[52px] items-center gap-4 border-b border-slate-100 px-4">
          <div className="h-3 w-24 animate-pulse rounded bg-slate-200" />
          <div className="h-3 w-20 animate-pulse rounded bg-slate-200" />
          <div className="h-3 flex-1 animate-pulse rounded bg-slate-200" />
          <div className="h-5 w-20 animate-pulse rounded-full bg-slate-200" />
          <div className="h-3 w-16 animate-pulse rounded bg-slate-200" />
        </div>
      ))}
    </div>
  );
}
