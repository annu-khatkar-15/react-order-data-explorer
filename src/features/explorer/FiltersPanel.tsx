import { useCallback, useId, type ReactNode } from 'react';
import { buttonClass, STATUS_DOT } from '../../components/styles';
import { useDebouncedDraft } from '../../hooks/useDebouncedDraft';
import { PAYMENT_LABELS, STATUS_LABELS } from '../../lib/format';
import { COUNTRIES, COUNTRY_CODES, ORDER_STATUSES, PAYMENT_METHODS } from '../../shared/order';
import type { OrderQuery } from '../../shared/orderQuery';
import type { SetQuery } from './useOrderQueryParams';

interface Props {
  id: string;
  query: OrderQuery;
  setQuery: SetQuery;
  onReset: () => void;
  className?: string;
}

const toggle = <T,>(list: readonly T[], value: T): T[] =>
  list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

export function FiltersPanel({ id, query, setQuery, onReset, className = '' }: Props) {
  const setMin = useCallback((v?: number) => setQuery({ minTotal: v }), [setQuery]);
  const setMax = useCallback((v?: number) => setQuery({ maxTotal: v }), [setQuery]);

  return (
    <aside id={id} aria-labelledby={`${id}-title`} className={className}>
      <div className="mb-3 flex items-center justify-between">
        <h2 id={`${id}-title`} className="text-sm font-semibold text-slate-900">
          Filters
        </h2>
        <button type="button" className={buttonClass.ghost} onClick={onReset}>
          Reset
        </button>
      </div>

      <div className="space-y-5">
        <CheckboxGroup legend="Status">
          {ORDER_STATUSES.map((s) => (
            <Checkbox
              key={s}
              checked={query.status.includes(s)}
              onChange={() => setQuery({ status: toggle(query.status, s) })}
            >
              <span className={`size-2 rounded-full ${STATUS_DOT[s]}`} aria-hidden="true" />
              {STATUS_LABELS[s]}
            </Checkbox>
          ))}
        </CheckboxGroup>

        <CheckboxGroup legend="Payment method">
          {PAYMENT_METHODS.map((p) => (
            <Checkbox
              key={p}
              checked={query.payment.includes(p)}
              onChange={() => setQuery({ payment: toggle(query.payment, p) })}
            >
              {PAYMENT_LABELS[p]}
            </Checkbox>
          ))}
        </CheckboxGroup>

        <fieldset>
          <legend className="mb-2 text-xs font-semibold tracking-wide text-slate-600 uppercase">
            Order total (USD)
          </legend>
          <div className="grid grid-cols-2 gap-2">
            <AmountInput label="Min" value={query.minTotal} onCommit={setMin} />
            <AmountInput label="Max" value={query.maxTotal} onCommit={setMax} />
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-xs font-semibold tracking-wide text-slate-600 uppercase">
            Order date
          </legend>
          <div className="grid grid-cols-1 gap-2">
            <DateInput
              label="From"
              value={query.from}
              max={query.to}
              onChange={(from) => setQuery({ from })}
            />
            <DateInput
              label="To"
              value={query.to}
              min={query.from}
              onChange={(to) => setQuery({ to })}
            />
          </div>
        </fieldset>

        <CheckboxGroup legend="Country" scroll>
          {COUNTRY_CODES.map((c) => (
            <Checkbox
              key={c}
              checked={query.country.includes(c)}
              onChange={() => setQuery({ country: toggle(query.country, c) })}
            >
              {COUNTRIES[c]}
            </Checkbox>
          ))}
        </CheckboxGroup>
      </div>
    </aside>
  );
}

function CheckboxGroup({
  legend,
  children,
  scroll,
}: {
  legend: string;
  children: ReactNode;
  scroll?: boolean;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-xs font-semibold tracking-wide text-slate-600 uppercase">
        {legend}
      </legend>
      <div className={`space-y-1 ${scroll ? 'max-h-56 overflow-y-auto pr-1 lg:max-h-none' : ''}`}>
        {children}
      </div>
    </fieldset>
  );
}

function Checkbox({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: () => void;
  children: ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-sm text-slate-800 hover:bg-slate-100">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="size-4 rounded border-slate-400 accent-indigo-600"
      />
      {children}
    </label>
  );
}

const inputClass =
  'w-full rounded-md border-0 bg-white px-2 py-1.5 text-sm text-slate-900 shadow-sm ring-1 ring-slate-300 ring-inset';

const cleanAmount = (v: string) => {
  const n = Number(v);
  return v.trim() === '' || !Number.isFinite(n) || n < 0 ? '' : String(n);
};

function AmountInput({
  label,
  value,
  onCommit,
}: {
  label: string;
  value: number | undefined;
  onCommit: (v?: number) => void;
}) {
  const id = useId();
  const commit = useCallback((v: string) => onCommit(v === '' ? undefined : Number(v)), [onCommit]);
  const [draft, setDraft, flush] = useDebouncedDraft(
    value === undefined ? '' : String(value),
    commit,
    {
      delayMs: 500,
      normalize: cleanAmount,
    },
  );
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs text-slate-600">
        {label}
      </label>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        min={0}
        step="any"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={flush}
        onKeyDown={(e) => e.key === 'Enter' && flush()}
        className={inputClass}
      />
    </div>
  );
}

function DateInput({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: string | undefined;
  min?: string;
  max?: string;
  onChange: (v?: string) => void;
}) {
  const id = useId();
  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="w-10 shrink-0 text-xs text-slate-600">
        {label}
      </label>
      <input
        id={id}
        type="date"
        value={value ?? ''}
        min={min}
        max={max}
        // Browsers only report a value once the date is complete and valid.
        onChange={(e) => onChange(e.target.value || undefined)}
        className={inputClass}
      />
    </div>
  );
}
