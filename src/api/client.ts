import type { ApiErrorBody } from '../shared/order';

/** A failed request, with a message that is safe to show to the user. */
export class ApiError extends Error {
  /** HTTP status, or 0 when the request never got a response (offline, DNS, CORS…). */
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }

  get isNotFound() {
    return this.status === 404;
  }

  /** Server errors and network failures are worth retrying; 4xx responses are not. */
  get isTransient() {
    return this.status === 0 || this.status >= 500;
  }
}

/**
 * GETs JSON from the API. Aborts propagate as the native AbortError, so callers (TanStack
 * Query) can tell a cancelled request from a failed one.
 */
export async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  let res: Response;
  try {
    res = await fetch(new URL(path, window.location.origin), {
      signal,
      headers: { Accept: 'application/json' },
    });
  } catch (err) {
    if (signal?.aborted) throw err;
    throw new ApiError('Could not reach the server. Check your connection and try again.', 0);
  }

  if (!res.ok) {
    let message = `The server responded with an error (${res.status}).`;
    try {
      const body = (await res.json()) as Partial<ApiErrorBody>;
      if (body.message) message = `${body.message} (${res.status})`;
    } catch {
      // Body is not JSON; keep the generic message.
    }
    throw new ApiError(message, res.status);
  }
  try {
    return (await res.json()) as T;
  } catch (err) {
    if (signal?.aborted) throw err;
    throw new ApiError('The server sent a response that could not be read.', res.status);
  }
}
