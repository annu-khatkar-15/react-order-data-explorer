import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './api/client';

// Every query function throws ApiError (see getJson), so type query errors as ApiError.
declare module '@tanstack/react-query' {
  interface Register {
    defaultError: ApiError;
  }
}

export function createQueryClient({ retry = true }: { retry?: boolean } = {}) {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        // Refetching on focus would replace what the user is reading without them asking.
        refetchOnWindowFocus: false,
        // One quiet retry for transient failures (5xx/network) only. A 404 is a real answer.
        // If the retry also fails, the error UI is shown, with a manual Retry button.
        retry: (failureCount, error) =>
          retry && failureCount < 1 && error instanceof ApiError && error.isTransient,
        retryDelay: 400,
      },
    },
  });
}
