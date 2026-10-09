import type { ReactNode } from 'react';
import { STATUS_LABELS } from '../lib/format';
import { buttonClass } from './styles';
import type { OrderStatus } from '../shared/order';

const STATUS_STYLES: Record<OrderStatus, string> = {
  pending: 'bg-amber-100 text-amber-900 ring-amber-300',
  processing: 'bg-sky-100 text-sky-900 ring-sky-300',
  shipped: 'bg-indigo-100 text-indigo-900 ring-indigo-300',
  delivered: 'bg-emerald-100 text-emerald-900 ring-emerald-300',
  cancelled: 'bg-slate-200 text-slate-800 ring-slate-300',
  refunded: 'bg-rose-100 text-rose-900 ring-rose-300',
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

export function Spinner({ className = 'size-4' }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path
        d="M22 12a10 10 0 0 0-10-10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

interface ErrorStateProps {
  title: string;
  message: string;
  onRetry: () => void;
  retrying?: boolean;
  children?: ReactNode;
  compact?: boolean;
}

/** A failure the user can act on. `role="alert"` makes screen readers announce it. */
export function ErrorState({
  title,
  message,
  onRetry,
  retrying,
  children,
  compact,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={`flex gap-3 rounded-lg border border-rose-200 bg-rose-50 text-rose-900 ${compact ? 'items-center p-3' : 'flex-col items-center p-8 text-center'}`}
    >
      <svg
        className={`${compact ? 'size-5' : 'size-8'} shrink-0 text-rose-600`}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
      >
        <path d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
      </svg>
      <div className={compact ? 'min-w-0 flex-1 text-sm' : ''}>
        <p className="font-semibold">{title}</p>
        <p className={compact ? '' : 'mt-1 text-sm'}>{message}</p>
        {children}
      </div>
      <button type="button" className={buttonClass.secondary} onClick={onRetry} disabled={retrying}>
        {retrying ? <Spinner /> : null}
        {retrying ? 'Retrying…' : 'Retry'}
      </button>
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 p-10 text-center text-slate-600">
      <svg
        className="size-10 text-slate-400"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <p className="font-semibold text-slate-900">{title}</p>
      {children}
    </div>
  );
}
