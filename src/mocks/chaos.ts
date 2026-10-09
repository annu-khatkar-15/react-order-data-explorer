// Simulated network conditions for the mock API: random latency and random failures.
// Defaults match the assignment (200 ms–3 s, ~1 in 10 requests fail). The settings can be
// overridden from tests (setChaos) and, in the browser, from localStorage so a demo can
// force failures without changing code.

export interface ChaosConfig {
  minLatencyMs: number;
  maxLatencyMs: number;
  /** Probability in [0, 1] that a request fails with a 5xx. */
  failureRate: number;
}

export const DEFAULT_CHAOS: ChaosConfig = {
  minLatencyMs: 200,
  maxLatencyMs: 3000,
  failureRate: 0.1,
};

export const CHAOS_STORAGE_KEY = 'order-explorer:chaos';

let config: ChaosConfig = { ...DEFAULT_CHAOS, ...readStoredChaos() };
let random: () => number = Math.random;

function readStoredChaos(): Partial<ChaosConfig> {
  try {
    const raw = globalThis.localStorage?.getItem(CHAOS_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Partial<ChaosConfig>) : {};
  } catch {
    return {};
  }
}

export const getChaos = (): ChaosConfig => config;

export function setChaos(next: Partial<ChaosConfig>, { persist = false } = {}) {
  config = { ...config, ...next };
  if (persist) {
    try {
      globalThis.localStorage?.setItem(CHAOS_STORAGE_KEY, JSON.stringify(config));
    } catch {
      // Storage unavailable (private mode etc.): the setting still applies to this session.
    }
  }
}

export function resetChaos() {
  config = { ...DEFAULT_CHAOS };
  random = Math.random;
  try {
    globalThis.localStorage?.removeItem(CHAOS_STORAGE_KEY);
  } catch {
    // ignore
  }
}

/** Lets tests make latency and failures deterministic. */
export function setChaosRandom(fn: () => number) {
  random = fn;
}

export function nextLatency(): number {
  const { minLatencyMs: min, maxLatencyMs: max } = config;
  return Math.round(min + random() * Math.max(0, max - min));
}

export function shouldFail(): boolean {
  return random() < config.failureRate;
}
