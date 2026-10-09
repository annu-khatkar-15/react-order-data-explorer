import type { OrderStatus } from '../shared/order';

export const STATUS_DOT: Record<OrderStatus, string> = {
  pending: 'bg-amber-500',
  processing: 'bg-sky-500',
  shipped: 'bg-indigo-500',
  delivered: 'bg-emerald-500',
  cancelled: 'bg-slate-400',
  refunded: 'bg-rose-500',
};

export const buttonClass = {
  primary:
    'inline-flex items-center justify-center gap-2 rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60',
  secondary:
    'inline-flex items-center justify-center gap-2 rounded-md bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50',
  ghost:
    'inline-flex items-center justify-center gap-1 rounded-md px-2 py-1 text-sm font-medium text-indigo-700 hover:bg-indigo-50',
};
