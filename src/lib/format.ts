import { COUNTRIES, type CountryCode, type OrderStatus, type PaymentMethod } from '../shared/order';

// Formatters are created once at module level; constructing Intl objects per row is slow.
const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const integer = new Intl.NumberFormat('en-US');
const date = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' });
const dateTime = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'UTC',
});

export const formatMoney = (cents: number) => money.format(cents / 100);
export const formatCount = (n: number) => integer.format(n);
export const formatDate = (iso: string) => date.format(new Date(iso));
export const formatDateTime = (iso: string) => `${dateTime.format(new Date(iso))} UTC`;
export const countryName = (code: CountryCode) => COUNTRIES[code];

export const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pending',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
};

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  card: 'Card',
  paypal: 'PayPal',
  bank_transfer: 'Bank transfer',
  apple_pay: 'Apple Pay',
};
