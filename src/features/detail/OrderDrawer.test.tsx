import { act, screen, waitFor, within } from '@testing-library/react';
import { setChaos } from '../../mocks/chaos';
import { getOrders } from '../../mocks/data';
import { dataRows, renderApp, statusText } from '../../test/renderApp';

const drawer = () => screen.getByRole('dialog', { name: /ORD-/ });

describe('order detail drawer', () => {
  it('opens from a row, keeps the list query in the URL, and closing restores the list', async () => {
    const { user, location } = renderApp('/?status=refunded&pageSize=25');
    await waitFor(() => expect(dataRows().length).toBeGreaterThan(2));
    const row = dataRows()[2]!;
    const id = row.getAttribute('data-order-id')!;

    await user.click(row);
    expect(location().pathname).toBe(`/orders/${id}`);
    expect(location().search).toBe('?status=refunded&pageSize=25');

    const order = getOrders().find((o) => o.id === id)!;
    const items = await within(drawer()).findByRole('table');
    expect(within(items).getAllByRole('row')).toHaveLength(order.lineItems.length + 3); // head + items + 2 totals
    expect(drawer()).toHaveTextContent(order.customerName);

    await user.click(within(drawer()).getByRole('button', { name: 'Close order details' }));
    expect(location().pathname).toBe('/');
    expect(location().search).toBe('?status=refunded&pageSize=25');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    // The list never unmounted, and focus is back on the row that opened the drawer.
    expect(document.activeElement).toHaveAttribute('data-order-id', id);
    expect(statusText()).toMatch(/^Showing 1–25 of/);
  });

  it('supports deep links: the drawer and the list behind it both load', async () => {
    const { user, location } = renderApp('/orders/ORD-100042?country=FR');
    expect(await screen.findByRole('heading', { name: 'ORD-100042' })).toBeInTheDocument();
    await within(drawer()).findByRole('table');
    await waitFor(() => expect(statusText()).toMatch(/^Showing/));

    // There is no list entry in history to go back to, so closing navigates to the list.
    await user.click(within(drawer()).getByRole('button', { name: 'Close order details' }));
    expect(location().pathname).toBe('/');
    expect(location().search).toBe('?country=FR');
  });

  it('shows "not found" for an unknown order', async () => {
    renderApp('/orders/ORD-999999');
    const alert = await within(await screen.findByRole('dialog')).findByRole('alert');
    expect(alert).toHaveTextContent('Order not found');
  });

  it('shows an error with Retry when the order fails to load', async () => {
    setChaos({ failureRate: 1 });
    const { user } = renderApp('/orders/ORD-100042');
    const dialog = await screen.findByRole('dialog');
    const alert = await within(dialog).findByRole('alert');
    expect(alert).toHaveTextContent('Couldn’t load this order');

    setChaos({ failureRate: 0 });
    await user.click(within(alert).getByRole('button', { name: 'Retry' }));
    await within(dialog).findByRole('table');
  });

  it('closes with the Back button', async () => {
    const { user, navigate, location } = renderApp('/?pageSize=25');
    await waitFor(() => expect(dataRows().length).toBeGreaterThan(0));
    await user.click(dataRows()[0]!);
    await screen.findByRole('dialog');
    act(() => void navigate(-1));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(location().search).toBe('?pageSize=25');
  });
});

describe('keyboard navigation in the grid', () => {
  it('moves between rows with the arrow keys and opens one with Enter', async () => {
    const { user, location } = renderApp('/?pageSize=25');
    await waitFor(() => expect(dataRows().length).toBeGreaterThan(3));

    // Exactly one row is in the Tab order (roving tabindex).
    expect(dataRows().filter((r) => r.tabIndex === 0)).toHaveLength(1);

    // Real Tab-order traversal is covered by the Playwright keyboard test.
    act(() => dataRows()[0]!.focus());
    await user.keyboard('{ArrowDown}{ArrowDown}');
    const third = dataRows()[2]!;
    expect(document.activeElement).toBe(third);
    expect(third.tabIndex).toBe(0);

    await user.keyboard('{End}');
    expect(document.activeElement).toHaveAttribute('aria-rowindex', '26'); // row 25 + header

    await user.keyboard('{Home}{ArrowDown}{Enter}');
    expect(location().pathname).toBe(`/orders/${dataRows()[1]!.getAttribute('data-order-id')}`);
  });
});
