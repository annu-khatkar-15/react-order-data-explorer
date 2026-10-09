import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import { orderKeys, useOrderQuery } from '../../api/orders';
import { buttonClass } from '../../components/styles';
import { ErrorState, StatusBadge } from '../../components/ui';
import { countryName, formatDateTime, formatMoney, PAYMENT_LABELS } from '../../lib/format';
import type { OrderPage, OrderSummary } from '../../shared/order';

/**
 * Order details as a modal side drawer at /orders/:orderId (the list's query string is
 * kept, so the URL is a deep link that also restores the list behind it).
 *
 * Uses the native <dialog> with showModal(): the browser provides the focus trap, the
 * inert background and Escape handling. The list underneath stays mounted, so its scroll
 * position, filters and keyboard position survive opening and closing.
 */
export default function OrderDrawer() {
  const { orderId = '' } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const openedFromList = (location.state as { fromList?: boolean } | null)?.fromList === true;

  const close = useCallback(() => {
    // Opened from the list: go back, so Back/Forward history stays clean.
    // Opened from a shared link: there is no list entry behind us, so replace instead.
    if (openedFromList) navigate(-1);
    else navigate({ pathname: '/', search: location.search }, { replace: true });
  }, [openedFromList, navigate, location.search]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
      // Return focus to the row that opened the drawer, or to the results region.
      const row = document.querySelector<HTMLElement>(
        `[role="row"][data-order-id="${CSS.escape(orderId)}"]`,
      );
      (row ?? document.getElementById('results'))?.focus({ preventScroll: true });
    };
  }, [orderId]);

  const detail = useOrderQuery(orderId);
  const summary = useCachedSummary(orderId);
  const order = detail.data;
  const head: OrderSummary | undefined = order ?? summary;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="order-drawer-title"
      onCancel={(e) => {
        e.preventDefault(); // let the router drive closing so the URL stays in sync
        close();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) close(); // click on the backdrop
      }}
      className="fixed inset-y-0 right-0 left-auto m-0 h-dvh max-h-dvh w-full max-w-xl bg-white p-0 shadow-2xl backdrop:bg-slate-900/40"
    >
      <div className="flex h-full flex-col">
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div className="min-w-0">
            <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">Order</p>
            <h2 id="order-drawer-title" className="font-mono text-xl font-semibold text-slate-900">
              {orderId}
            </h2>
            {head ? (
              <div className="mt-1 flex items-center gap-2 text-sm text-slate-600">
                <StatusBadge status={head.status} />
                <span>{formatDateTime(head.createdAt)}</span>
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={close}
            className={buttonClass.secondary}
            aria-label="Close order details"
          >
            <svg className="size-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path d="M6.3 5.3a1 1 0 0 0-1.4 1.4L8.6 10l-3.7 3.3a1 1 0 1 0 1.4 1.4L10 11.4l3.3 3.3a1 1 0 0 0 1.4-1.4L11.4 10l3.3-3.3a1 1 0 0 0-1.4-1.4L10 8.6 6.3 5.3Z" />
            </svg>
            <span className="hidden sm:inline">Close</span>
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5" aria-busy={detail.isPending}>
          {detail.isError && detail.error.isNotFound ? (
            <div
              role="alert"
              className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-center"
            >
              <p className="font-semibold text-slate-900">Order not found</p>
              <p className="mt-1 text-sm text-slate-600">
                There is no order with the ID {orderId}.
              </p>
            </div>
          ) : detail.isError ? (
            <ErrorState
              title="Couldn’t load this order"
              message={detail.error.message}
              onRetry={() => void detail.refetch()}
              retrying={detail.isFetching}
            />
          ) : null}

          {head ? (
            <Section title="Customer">
              <Field label="Name">{head.customerName}</Field>
              <Field label="Email">
                <a
                  className="text-indigo-700 underline-offset-2 hover:underline"
                  href={`mailto:${head.email}`}
                >
                  {head.email}
                </a>
              </Field>
              <Field label="Country">{countryName(head.country)}</Field>
              <Field label="Payment">{PAYMENT_LABELS[head.paymentMethod]}</Field>
            </Section>
          ) : null}

          {order ? (
            <>
              <Section title="Shipping address">
                <Field label="Address">
                  {order.shippingAddress.line1}, {order.shippingAddress.city}{' '}
                  {order.shippingAddress.postalCode}, {countryName(order.shippingAddress.country)}
                </Field>
              </Section>

              <section aria-labelledby="items-heading">
                <h3 id="items-heading" className="mb-2 text-sm font-semibold text-slate-900">
                  Items
                </h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-xs text-slate-600 uppercase">
                      <th scope="col" className="py-2 font-semibold">
                        Product
                      </th>
                      <th scope="col" className="py-2 text-right font-semibold">
                        Qty
                      </th>
                      <th scope="col" className="py-2 text-right font-semibold">
                        Price
                      </th>
                      <th scope="col" className="py-2 text-right font-semibold">
                        Subtotal
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.lineItems.map((li, i) => (
                      <tr key={`${li.sku}-${i}`} className="border-b border-slate-100">
                        <td className="py-2">
                          <div className="font-medium text-slate-900">{li.name}</div>
                          <div className="font-mono text-xs text-slate-500">{li.sku}</div>
                        </td>
                        <td className="py-2 text-right tabular-nums">{li.quantity}</td>
                        <td className="py-2 text-right tabular-nums">
                          {formatMoney(li.unitPriceCents)}
                        </td>
                        <td className="py-2 text-right tabular-nums">
                          {formatMoney(li.quantity * li.unitPriceCents)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="tabular-nums">
                    <tr>
                      <th
                        scope="row"
                        colSpan={3}
                        className="pt-3 text-right font-normal text-slate-600"
                      >
                        Shipping
                      </th>
                      <td className="pt-3 text-right">
                        {order.shippingCents ? formatMoney(order.shippingCents) : 'Free'}
                      </td>
                    </tr>
                    <tr>
                      <th
                        scope="row"
                        colSpan={3}
                        className="pt-1 text-right font-semibold text-slate-900"
                      >
                        Total
                      </th>
                      <td className="pt-1 text-right font-semibold text-slate-900">
                        {formatMoney(order.totalCents)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </section>
            </>
          ) : detail.isPending ? (
            <div className="space-y-3" aria-hidden="true">
              {!head ? <div className="h-24 animate-pulse rounded-lg bg-slate-100" /> : null}
              <div className="h-12 animate-pulse rounded-lg bg-slate-100" />
              <div className="h-40 animate-pulse rounded-lg bg-slate-100" />
            </div>
          ) : null}
          {detail.isPending ? (
            <p className="sr-only" role="status">
              Loading order details…
            </p>
          ) : null}
        </div>
      </div>
    </dialog>
  );
}

/** Row data already loaded by the list, shown instantly while the full record loads. */
function useCachedSummary(id: string): OrderSummary | undefined {
  const queryClient = useQueryClient();
  return useMemo(() => {
    for (const [, page] of queryClient.getQueriesData<OrderPage>({ queryKey: orderKeys.lists() })) {
      const hit = page?.items.find((o) => o.id === id);
      if (hit) return hit;
    }
    return undefined;
  }, [queryClient, id]);
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-sm font-semibold text-slate-900">{title}</h3>
      <dl className="grid grid-cols-[7rem_1fr] gap-x-3 gap-y-1.5 text-sm">{children}</dl>
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-slate-600">{label}</dt>
      <dd className="min-w-0 break-words text-slate-900">{children}</dd>
    </>
  );
}
