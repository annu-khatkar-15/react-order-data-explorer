import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  MemoryRouter,
  useLocation,
  useNavigate,
  type Location,
  type NavigateFunction,
} from 'react-router';
import { AppRoutes } from '../App';
import { createQueryClient } from '../queryClient';

/**
 * Renders the real app (routes, query client, mock API via MSW) at a URL and exposes the
 * router location and navigate(), so tests can assert on URL state and press Back/Forward.
 */
export function renderApp(url = '/') {
  const router: { location?: Location; navigate?: NavigateFunction } = {};
  function RouterProbe() {
    router.location = useLocation();
    router.navigate = useNavigate();
    return null;
  }
  // Automatic retries are switched off so each simulated failure is seen directly.
  const queryClient = createQueryClient({ retry: false });
  const result = render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[url]}>
        <AppRoutes />
        <RouterProbe />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return {
    ...result,
    queryClient,
    user: userEvent.setup(),
    location: () => router.location!,
    search: () => router.location!.search,
    navigate: (to: number) => router.navigate!(to),
  };
}

/** Data rows currently rendered in the virtualized grid (header row excluded). */
export function dataRows() {
  const grid = screen.queryByRole('grid', { name: 'Orders' });
  return grid
    ? within(grid)
        .queryAllByRole('row')
        .filter((r) => r.hasAttribute('data-order-id'))
    : [];
}

/** Text of the results live region (what screen readers hear). */
export const statusText = () => screen.getByTestId('results-status').textContent ?? '';
