import { act, screen, waitFor, within } from '@testing-library/react';
import { delay, http, HttpResponse } from 'msw';
import { setChaos } from '../../mocks/chaos';
import { getOrders } from '../../mocks/data';
import { queryOrders } from '../../mocks/query';
import { server } from '../../mocks/server';
import { DEFAULT_QUERY, parseOrderQuery, type OrderQuery } from '../../shared/orderQuery';
import { dataRows, renderApp, statusText } from '../../test/renderApp';

const expectedTotal = (q: Partial<OrderQuery>) =>
  queryOrders(getOrders(), { ...DEFAULT_QUERY, ...q }).total;
const fmt = (n: number) => n.toLocaleString('en-US');
const searchBox = () => screen.getByRole('searchbox', { name: 'Search orders' });

/** Records the `q` of every list request, plus whether the client aborted it. */
function trackListRequests(delayFor: (q: string) => number = () => 0) {
  const seen: { q: string; aborted: boolean }[] = [];
  server.use(
    http.get('/api/orders', async ({ request }) => {
      const url = new URL(request.url);
      const entry = { q: url.searchParams.get('q') ?? '', aborted: false };
      seen.push(entry);
      request.signal.addEventListener('abort', () => (entry.aborted = true));
      await delay(delayFor(entry.q));
      return HttpResponse.json(queryOrders(getOrders(), parseOrderQuery(url.searchParams)));
    }),
  );
  return seen;
}

describe('loading results', () => {
  it('renders the first page and announces the result count', async () => {
    renderApp('/?pageSize=25');
    expect(statusText()).toMatch(/Loading orders/);
    await waitFor(() => expect(statusText()).toBe('Showing 1–25 of 12,000 orders'));
    // Default sort is newest first, and IDs increase with time.
    expect(dataRows()[0]).toHaveAttribute('data-order-id', 'ORD-112000');
  });

  it('only renders a window of rows for a 1,000-row page', async () => {
    renderApp('/?pageSize=1000');
    await waitFor(() => expect(statusText()).toBe('Showing 1–1,000 of 12,000 orders'));
    const rendered = dataRows().length;
    expect(rendered).toBeGreaterThan(5);
    expect(rendered).toBeLessThan(40);
    expect(screen.getByRole('grid', { name: 'Orders' })).toHaveAttribute('aria-rowcount', '1001');
  });
});

describe('race conditions and debouncing', () => {
  it('debounces typing into a single request for the final term', async () => {
    const seen = trackListRequests();
    const { user, search } = renderApp('/');
    await waitFor(() => expect(dataRows().length).toBeGreaterThan(0));

    await user.type(searchBox(), 'tanaka');
    await waitFor(() => expect(search()).toBe('?q=tanaka'));
    await waitFor(() =>
      expect(statusText()).toMatch(`of ${fmt(expectedTotal({ q: 'tanaka' }))} orders`),
    );

    // One request for the initial view, one for the final term; no request per keystroke.
    expect(seen.map((r) => r.q)).toEqual(['', 'tanaka']);
  });

  it('never lets a slow, superseded response overwrite a newer one', async () => {
    // "olivia" is slow (600 ms); the refined "olivia smith" is fast (20 ms), so the newer
    // response arrives first. The stale one must be cancelled and must never be rendered.
    const seen = trackListRequests((q) => (q === 'olivia' ? 600 : 20));
    const { user, search } = renderApp('/');
    await waitFor(() => expect(dataRows().length).toBeGreaterThan(0));

    await user.type(searchBox(), 'olivia');
    await waitFor(() => expect(seen.some((r) => r.q === 'olivia')).toBe(true));
    await user.type(searchBox(), ' smith');
    await waitFor(() => expect(search()).toBe('?q=olivia+smith'));

    const newerTotal = fmt(expectedTotal({ q: 'olivia smith' }));
    await waitFor(() => expect(statusText()).toMatch(`of ${newerTotal} orders`));

    // Let the slow "olivia" response arrive, if it were going to.
    await act(() => new Promise((r) => setTimeout(r, 800)));

    expect(statusText()).toMatch(`of ${newerTotal} orders`);
    for (const row of dataRows()) expect(row).toHaveTextContent(/olivia/i);
    for (const row of dataRows()) expect(row).toHaveTextContent(/smith/i);
    expect(seen.find((r) => r.q === 'olivia')?.aborted).toBe(true);
  });

  it('marks old rows as out of date while a new query loads', async () => {
    trackListRequests((q) => (q === 'kim' ? 400 : 0));
    const { user } = renderApp('/');
    await waitFor(() => expect(dataRows().length).toBeGreaterThan(0));

    await user.type(searchBox(), 'kim{Enter}');
    const grid = screen.getByRole('grid', { name: 'Orders' });
    await waitFor(() => expect(grid).toHaveAttribute('aria-busy', 'true'));
    expect(statusText()).toBe('Updating results…');

    await waitFor(() => expect(grid).toHaveAttribute('aria-busy', 'false'));
    expect(statusText()).toMatch(`of ${fmt(expectedTotal({ q: 'kim' }))} orders`);
  });
});

describe('URL state', () => {
  it('restores search, filters, sort and page from the URL', async () => {
    const q: Partial<OrderQuery> = {
      q: 'smith',
      status: ['delivered'],
      sort: 'totalCents',
      dir: 'asc',
      page: 2,
      pageSize: 25,
    };
    expect(expectedTotal(q)).toBeGreaterThan(50); // page 2 is a full page
    renderApp('/?q=smith&status=delivered&sort=totalCents&dir=asc&page=2&pageSize=25');

    await waitFor(() =>
      expect(statusText()).toBe(`Showing 26–50 of ${fmt(expectedTotal(q))} orders`),
    );
    expect(searchBox()).toHaveValue('smith');
    expect(screen.getByRole('checkbox', { name: 'Delivered' })).toBeChecked();
    expect(screen.getByRole('columnheader', { name: /total/i })).toHaveAttribute(
      'aria-sort',
      'ascending',
    );
    expect(screen.getByRole('button', { name: 'Page 2' })).toHaveAttribute('aria-current', 'page');

    const expectedFirst = queryOrders(getOrders(), { ...DEFAULT_QUERY, ...q }).items[0]!.id;
    expect(dataRows()[0]).toHaveAttribute('data-order-id', expectedFirst);
  });

  it('writes every change to the URL, and Back/Forward restore each view', async () => {
    const { user, search, navigate } = renderApp('/');
    await waitFor(() => expect(dataRows().length).toBeGreaterThan(0));

    await user.click(screen.getByRole('checkbox', { name: 'Shipped' }));
    expect(search()).toBe('?status=shipped');

    await user.click(
      within(screen.getByRole('columnheader', { name: /total/i })).getByRole('button'),
    );
    expect(search()).toBe('?status=shipped&sort=totalCents');

    await user.type(searchBox(), 'kim');
    await waitFor(() => expect(search()).toBe('?q=kim&status=shipped&sort=totalCents'));

    act(() => void navigate(-1));
    await waitFor(() => expect(searchBox()).toHaveValue(''));
    expect(search()).toBe('?status=shipped&sort=totalCents');

    act(() => void navigate(-1));
    await waitFor(() =>
      expect(screen.getByRole('columnheader', { name: /date/i })).toHaveAttribute(
        'aria-sort',
        'descending',
      ),
    );
    expect(screen.getByRole('checkbox', { name: 'Shipped' })).toBeChecked();

    act(() => void navigate(1));
    act(() => void navigate(1));
    await waitFor(() => expect(searchBox()).toHaveValue('kim'));
    await waitFor(() =>
      expect(statusText()).toMatch(
        `of ${fmt(expectedTotal({ q: 'kim', status: ['shipped'] }))} orders`,
      ),
    );
  });

  it('returns to page 1 when a filter changes', async () => {
    const { user, search } = renderApp('/?page=3&pageSize=25');
    await waitFor(() => expect(statusText()).toMatch(/^Showing 51–75/));
    await user.click(screen.getByRole('checkbox', { name: 'Card' }));
    expect(search()).toBe('?payment=card&pageSize=25');
  });

  it('canonicalises invalid or messy links', async () => {
    const { search } = renderApp('/?page=-2&status=shipped,bogus&sort=nope&pageSize=25');
    await waitFor(() => expect(search()).toBe('?status=shipped&pageSize=25'));
  });
});

describe('error, empty and partial-failure states', () => {
  it('shows a clear error with Retry, and never leaves old rows looking current', async () => {
    const { user } = renderApp('/?pageSize=25');
    await waitFor(() => expect(dataRows().length).toBeGreaterThan(0));

    setChaos({ failureRate: 1 });
    await user.click(screen.getByRole('checkbox', { name: 'Cancelled' }));

    // Every request fails, so the summary shows its own alert too; find the list's.
    const alert = await waitFor(() => {
      const found = screen
        .getAllByRole('alert')
        .find((a) => a.textContent?.includes('Couldn’t load orders'));
      if (!found) throw new Error('list error alert not shown yet');
      return found;
    });
    expect(alert).toHaveTextContent(/\((500|503)\)/); // the server's message and status
    // The previous rows are gone: nothing on screen claims to be the current result.
    expect(screen.queryByRole('grid', { name: 'Orders' })).not.toBeInTheDocument();
    expect(statusText()).not.toMatch(/Showing/);

    setChaos({ failureRate: 0 });
    await user.click(within(alert).getByRole('button', { name: 'Retry' }));
    await waitFor(() =>
      expect(statusText()).toMatch(`of ${fmt(expectedTotal({ status: ['cancelled'] }))} orders`),
    );
    for (const row of dataRows()) expect(row).toHaveTextContent('Cancelled');
  });

  it('shows a partial failure when only the summary fails, keeping the list usable', async () => {
    let failStats = true;
    server.use(
      http.get('/api/orders/stats', () =>
        failStats
          ? HttpResponse.json({ message: 'Stats service down' }, { status: 503 })
          : undefined,
      ),
    );
    const { user } = renderApp('/?country=JP');

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Summary unavailable');
    expect(alert).toHaveTextContent('Stats service down (503)');
    expect(alert).toHaveTextContent('The order list is not affected');
    await waitFor(() =>
      expect(statusText()).toMatch(`of ${fmt(expectedTotal({ country: ['JP'] }))} orders`),
    );
    expect(dataRows().length).toBeGreaterThan(0);

    failStats = false;
    await user.click(within(alert).getByRole('button', { name: 'Retry' }));
    const summary = await screen.findByRole('region', { name: 'Summary' });
    await waitFor(() => expect(summary).toHaveTextContent(fmt(expectedTotal({ country: ['JP'] }))));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows an empty state that can clear the search', async () => {
    const { user, search } = renderApp('/?q=zzzzzz&status=shipped');
    await screen.findByText('No orders match your search and filters');
    expect(statusText()).toBe('No matching orders');
    await user.click(screen.getByRole('button', { name: 'Clear search and filters' }));
    expect(search()).toBe('');
    await waitFor(() => expect(dataRows().length).toBeGreaterThan(0));
    expect(searchBox()).toHaveValue('');
  });

  it('handles a page number past the end', async () => {
    const { user, search } = renderApp('/?page=9999');
    await screen.findByText('Page 9,999 doesn’t exist');
    await user.click(screen.getByRole('button', { name: 'Go to the last page' }));
    expect(search()).toBe('?page=120');
    await waitFor(() => expect(statusText()).toBe('Showing 11,901–12,000 of 12,000 orders'));
  });
});
