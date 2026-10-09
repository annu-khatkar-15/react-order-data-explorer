import { useId } from 'react';
import { useDebouncedDraft } from '../../hooks/useDebouncedDraft';

export const SEARCH_DEBOUNCE_MS = 300;

const trim = (v: string) => v.trim();

interface Props {
  value: string;
  onSearch: (q: string) => void;
}

export function SearchBox({ value, onSearch }: Props) {
  const id = useId();
  const [draft, setDraft, flush] = useDebouncedDraft(value, onSearch, {
    delayMs: SEARCH_DEBOUNCE_MS,
    normalize: trim,
  });

  return (
    <form
      role="search"
      className="relative min-w-0 flex-1"
      onSubmit={(e) => {
        e.preventDefault();
        flush();
      }}
    >
      <label htmlFor={id} className="sr-only">
        Search orders
      </label>
      <svg
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <input
        id={id}
        type="search"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && draft) {
            e.preventDefault();
            setDraft('');
          }
        }}
        placeholder="Search by order ID, customer name or email…"
        autoComplete="off"
        spellCheck={false}
        maxLength={200}
        className="w-full rounded-md border-0 bg-white py-2 pr-3 pl-9 text-sm text-slate-900 shadow-sm ring-1 ring-slate-300 ring-inset placeholder:text-slate-500"
      />
    </form>
  );
}
