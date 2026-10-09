import { countryName, formatDate, PAYMENT_LABELS, STATUS_LABELS } from '../../lib/format';
import type { OrderQuery } from '../../shared/orderQuery';

interface Chip {
  key: string;
  label: string;
  remove: Partial<OrderQuery>;
}

export function chipsFor(q: OrderQuery): Chip[] {
  const chips: Chip[] = [];
  if (q.q) chips.push({ key: 'q', label: `Search: “${q.q}”`, remove: { q: '' } });
  for (const s of q.status)
    chips.push({
      key: `s-${s}`,
      label: `Status: ${STATUS_LABELS[s]}`,
      remove: { status: q.status.filter((x) => x !== s) },
    });
  for (const p of q.payment)
    chips.push({
      key: `p-${p}`,
      label: `Payment: ${PAYMENT_LABELS[p]}`,
      remove: { payment: q.payment.filter((x) => x !== p) },
    });
  for (const c of q.country)
    chips.push({
      key: `c-${c}`,
      label: `Country: ${countryName(c)}`,
      remove: { country: q.country.filter((x) => x !== c) },
    });
  if (q.minTotal !== undefined)
    chips.push({ key: 'min', label: `Total ≥ $${q.minTotal}`, remove: { minTotal: undefined } });
  if (q.maxTotal !== undefined)
    chips.push({ key: 'max', label: `Total ≤ $${q.maxTotal}`, remove: { maxTotal: undefined } });
  if (q.from)
    chips.push({
      key: 'from',
      label: `From ${formatDate(`${q.from}T00:00:00Z`)}`,
      remove: { from: undefined },
    });
  if (q.to)
    chips.push({
      key: 'to',
      label: `To ${formatDate(`${q.to}T00:00:00Z`)}`,
      remove: { to: undefined },
    });
  return chips;
}

export function countActiveFilters(q: OrderQuery) {
  return chipsFor(q).filter((c) => c.key !== 'q').length;
}
