// Domain types shared by the mock API and the client.

export const ORDER_STATUSES = [
  'pending',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_METHODS = ['card', 'paypal', 'bank_transfer', 'apple_pay'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const COUNTRIES = {
  US: 'United States',
  GB: 'United Kingdom',
  DE: 'Germany',
  FR: 'France',
  IN: 'India',
  CA: 'Canada',
  AU: 'Australia',
  JP: 'Japan',
  BR: 'Brazil',
  NL: 'Netherlands',
  ES: 'Spain',
  SE: 'Sweden',
} as const;
export type CountryCode = keyof typeof COUNTRIES;
export const COUNTRY_CODES = Object.keys(COUNTRIES) as [CountryCode, ...CountryCode[]];

/** Row shape returned by the list endpoint. Money is in integer cents. */
export interface OrderSummary {
  id: string;
  customerName: string;
  email: string;
  status: OrderStatus;
  totalCents: number;
  itemCount: number;
  country: CountryCode;
  paymentMethod: PaymentMethod;
  createdAt: string; // ISO 8601
}

export interface LineItem {
  sku: string;
  name: string;
  quantity: number;
  unitPriceCents: number;
}

/** Full record returned by the detail endpoint. */
export interface Order extends OrderSummary {
  lineItems: LineItem[];
  shippingCents: number;
  shippingAddress: { line1: string; city: string; postalCode: string; country: CountryCode };
}

export interface OrderPage {
  items: OrderSummary[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

export interface OrderStats {
  count: number;
  revenueCents: number;
  averageCents: number;
  byStatus: Record<OrderStatus, number>;
}

export interface ApiErrorBody {
  message: string;
}
