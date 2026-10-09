import { useQueryClient } from '@tanstack/react-query';
import { useId, useRef, useState } from 'react';
import { getChaos, setChaos, type ChaosConfig } from '../../mocks/chaos';

const LATENCY_PRESETS = [
  { id: 'instant', label: 'Instant', min: 0, max: 0 },
  { id: 'realistic', label: '0.2–3 s (default)', min: 200, max: 3000 },
  { id: 'slow', label: 'Slow, 2.5–4 s', min: 2500, max: 4000 },
] as const;

const FAILURE_PRESETS = [
  { rate: 0, label: 'Never' },
  { rate: 0.1, label: '1 in 10 (default)' },
  { rate: 0.5, label: 'Half' },
  { rate: 1, label: 'Always' },
] as const;

const latencyIdOf = (c: ChaosConfig) =>
  LATENCY_PRESETS.find((p) => p.min === c.minLatencyMs && p.max === c.maxLatencyMs)?.id ?? 'custom';

/**
 * Lets anyone using the app control how the mock API misbehaves, so slow responses,
 * failures and recovery can be seen without opening DevTools. Settings are kept in
 * localStorage. Changing them clears cached results, so the next view is fetched under
 * the new conditions.
 */
export function NetworkSimulator() {
  const [config, setConfig] = useState<ChaosConfig>(getChaos);
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const queryClient = useQueryClient();
  const latencyName = useId();
  const failureName = useId();

  const update = (patch: Partial<ChaosConfig>) => {
    setChaos(patch, { persist: true });
    setConfig(getChaos());
    queryClient.removeQueries({ type: 'inactive' });
  };

  const latencyLabel =
    LATENCY_PRESETS.find((p) => p.id === latencyIdOf(config))?.label.replace(' (default)', '') ??
    'Custom';
  const failureLabel = `${Math.round(config.failureRate * 100)}% failures`;

  return (
    <details
      ref={detailsRef}
      className="relative"
      onKeyDown={(e) => {
        if (e.key === 'Escape' && detailsRef.current?.open) {
          detailsRef.current.open = false;
          detailsRef.current.querySelector('summary')?.focus();
        }
      }}
    >
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-md bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm ring-1 ring-slate-300 ring-inset hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
        <span
          className={`size-2 rounded-full ${config.failureRate > 0.1 ? 'bg-rose-500' : config.failureRate > 0 ? 'bg-amber-500' : 'bg-emerald-500'}`}
          aria-hidden="true"
        />
        <span>
          Network simulation: <span className="font-medium">{latencyLabel}</span>, {failureLabel}
        </span>
      </summary>
      <div className="absolute right-0 z-40 mt-2 w-72 space-y-4 rounded-lg border border-slate-200 bg-white p-4 text-sm shadow-lg">
        <p className="text-xs text-slate-600">
          The mock API runs in your browser. Use these settings to reproduce slow or failing
          requests.
        </p>
        <fieldset>
          <legend className="mb-1 font-semibold text-slate-900">Response time</legend>
          {LATENCY_PRESETS.map((p) => (
            <label key={p.id} className="flex items-center gap-2 py-0.5">
              <input
                type="radio"
                name={latencyName}
                checked={latencyIdOf(config) === p.id}
                onChange={() => update({ minLatencyMs: p.min, maxLatencyMs: p.max })}
                className="accent-indigo-600"
              />
              {p.label}
            </label>
          ))}
        </fieldset>
        <fieldset>
          <legend className="mb-1 font-semibold text-slate-900">Requests that fail</legend>
          {FAILURE_PRESETS.map((p) => (
            <label key={p.rate} className="flex items-center gap-2 py-0.5">
              <input
                type="radio"
                name={failureName}
                checked={config.failureRate === p.rate}
                onChange={() => update({ failureRate: p.rate })}
                className="accent-indigo-600"
              />
              {p.label}
            </label>
          ))}
        </fieldset>
        <p className="text-xs text-slate-500">
          A failed request is retried once automatically before an error is shown.
        </p>
      </div>
    </details>
  );
}
