import { useCallback, useEffect, useState } from 'react';

const identity = (v: string) => v;

/**
 * Local "draft" state for an input whose committed value lives elsewhere (the URL).
 *
 * - Typing updates the draft immediately and commits after `delayMs` of inactivity.
 * - `flush()` commits right away (Enter key, blur).
 * - When the committed value changes from outside (Back button, "Clear filters"), the
 *   draft follows it. It does *not* follow our own commits, so a debounced commit landing
 *   while the user keeps typing never overwrites newer keystrokes.
 */
export function useDebouncedDraft(
  committed: string,
  onCommit: (value: string) => void,
  {
    delayMs = 300,
    normalize = identity,
  }: {
    delayMs?: number;
    /** Must be referentially stable (module-level), or the debounce timer restarts every render. */
    normalize?: (v: string) => string;
  } = {},
) {
  const [draft, setDraft] = useState(committed);
  const [seen, setSeen] = useState(committed);
  const [lastOwnCommit, setLastOwnCommit] = useState<string | null>(null);

  // Adjust state during render when the committed value changes (React-recommended pattern
  // instead of a syncing effect).
  if (committed !== seen) {
    setSeen(committed);
    if (committed !== lastOwnCommit) setDraft(committed);
    setLastOwnCommit(null); // only the very next change can be the echo of our own commit
  }

  const commit = useCallback(
    (value: string) => {
      const next = normalize(value);
      setLastOwnCommit(next);
      if (next !== committed) onCommit(next);
    },
    [committed, normalize, onCommit],
  );

  useEffect(() => {
    if (normalize(draft) === committed) return;
    const timer = setTimeout(() => commit(draft), delayMs);
    return () => clearTimeout(timer);
  }, [draft, committed, normalize, commit, delayMs]);

  const flush = useCallback(() => commit(draft), [commit, draft]);

  return [draft, setDraft, flush] as const;
}
