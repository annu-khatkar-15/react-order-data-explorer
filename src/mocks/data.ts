import {
  COUNTRY_CODES,
  type CountryCode,
  type LineItem,
  type Order,
  type OrderStatus,
  type PaymentMethod,
} from '../shared/order';

// Deterministic dataset: the same seed always yields the same orders, so
// links, screenshots and tests stay reproducible across reloads and machines.

export const ORDER_COUNT = 12_000;
const SEED = 20260101;

/** mulberry32: tiny, fast, seedable PRNG returning floats in [0, 1). */
export function createRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST_NAMES = [
  'Aarav',
  'Amelia',
  'Liam',
  'Olivia',
  'Noah',
  'Emma',
  'Mateo',
  'Sofia',
  'Lukas',
  'Mia',
  'Hiroshi',
  'Yuki',
  'Priya',
  'Arjun',
  'Chloe',
  'Lucas',
  'Ines',
  'Hugo',
  'Freya',
  'Oscar',
  'Ananya',
  'Diego',
  'Lea',
  'Elias',
  'Nora',
  'Kenji',
  'Isla',
  'Rafael',
  'Zara',
  'Felix',
  'Maya',
  'Leo',
  'Sara',
  'Theo',
  'Aisha',
  'Jonas',
  'Valentina',
  'Ethan',
  'Hannah',
  'Ravi',
] as const;

const LAST_NAMES = [
  'Smith',
  'Patel',
  'Müller',
  'Martin',
  'Tanaka',
  'Silva',
  'Johansson',
  'Garcia',
  'Brown',
  'Nguyen',
  'Kumar',
  'Dubois',
  'Schmidt',
  'Rossi',
  'Sato',
  'Jansen',
  'Lopez',
  'Wilson',
  'Andersson',
  'Fischer',
  'Sharma',
  'Moreau',
  'Costa',
  'Taylor',
  'Kim',
  'Bakker',
  'Fernández',
  'Clark',
  'Watanabe',
  'Singh',
  'Lefebvre',
  'Weber',
  'Santos',
  'Evans',
  'Lindqvist',
  'Reddy',
] as const;

const EMAIL_DOMAINS = ['example.com', 'mail.test', 'inbox.test', 'post.example'] as const;

const PRODUCTS = [
  ['Wireless Mouse', 1999, 4999],
  ['Mechanical Keyboard', 6999, 18999],
  ['USB-C Hub', 2499, 7999],
  ['27" Monitor', 17999, 49999],
  ['Laptop Stand', 2999, 8999],
  ['Noise-Cancelling Headphones', 9999, 39999],
  ['Webcam 1080p', 3999, 12999],
  ['Desk Lamp', 1999, 6999],
  ['Ergonomic Chair', 19999, 89999],
  ['Standing Desk', 29999, 99999],
  ['External SSD 1TB', 7999, 19999],
  ['Phone Charger', 999, 3999],
  ['Bluetooth Speaker', 2999, 14999],
  ['Cable Organizer', 599, 1999],
  ['Mouse Pad XL', 999, 3499],
  ['Microphone', 4999, 19999],
  ['Graphics Tablet', 5999, 29999],
  ['Smartwatch', 14999, 49999],
  ['Backpack', 3999, 12999],
  ['Notebook Set', 499, 1999],
] as const;

const STREETS = ['Oak St', 'Maple Ave', 'High St', 'Station Rd', 'Park Lane', 'Mill Rd', 'Elm St'];
const CITIES: Record<CountryCode, string[]> = {
  US: ['New York', 'Austin', 'Seattle'],
  GB: ['London', 'Leeds', 'Bristol'],
  DE: ['Berlin', 'Munich', 'Hamburg'],
  FR: ['Paris', 'Lyon', 'Nantes'],
  IN: ['Bengaluru', 'Mumbai', 'Pune'],
  CA: ['Toronto', 'Vancouver', 'Montreal'],
  AU: ['Sydney', 'Melbourne', 'Perth'],
  JP: ['Tokyo', 'Osaka', 'Kyoto'],
  BR: ['São Paulo', 'Rio de Janeiro', 'Curitiba'],
  NL: ['Amsterdam', 'Utrecht', 'Rotterdam'],
  ES: ['Madrid', 'Barcelona', 'Valencia'],
  SE: ['Stockholm', 'Gothenburg', 'Malmö'],
};

const STATUS_WEIGHTS: [OrderStatus, number][] = [
  ['delivered', 45],
  ['shipped', 18],
  ['processing', 12],
  ['pending', 10],
  ['cancelled', 9],
  ['refunded', 6],
];

const PAYMENT_WEIGHTS: [PaymentMethod, number][] = [
  ['card', 55],
  ['paypal', 22],
  ['apple_pay', 15],
  ['bank_transfer', 8],
];

const RANGE_START = Date.UTC(2024, 0, 1);
const RANGE_END = Date.UTC(2026, 8, 30, 23, 59, 59);

export function generateOrders(count = ORDER_COUNT, seed = SEED): Order[] {
  const rand = createRng(seed);
  const int = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1));
  const pick = <T>(list: readonly T[]): T => list[Math.floor(rand() * list.length)]!;
  const weighted = <T>(entries: [T, number][]): T => {
    const total = entries.reduce((sum, [, w]) => sum + w, 0);
    let r = rand() * total;
    for (const [value, w] of entries) {
      r -= w;
      if (r < 0) return value;
    }
    return entries[entries.length - 1]![0];
  };

  // Generate timestamps first and sort them so IDs increase with time.
  const timestamps = Array.from({ length: count }, () =>
    Math.floor(RANGE_START + rand() * (RANGE_END - RANGE_START)),
  ).sort((a, b) => a - b);

  return timestamps.map((ts, i) => {
    const first = pick(FIRST_NAMES);
    const last = pick(LAST_NAMES);
    const country = pick(COUNTRY_CODES);

    const lineItems: LineItem[] = Array.from({ length: int(1, 4) }, () => {
      const [name, min, max] = pick(PRODUCTS);
      return {
        sku: `SKU-${name
          .replace(/[^A-Za-z0-9]/g, '')
          .slice(0, 6)
          .toUpperCase()}-${int(10, 99)}`,
        name,
        quantity: int(1, 3),
        unitPriceCents: int(min, max),
      };
    });
    const subtotal = lineItems.reduce((sum, li) => sum + li.quantity * li.unitPriceCents, 0);
    const shippingCents = subtotal > 10_000 ? 0 : pick([499, 799, 999]);

    return {
      id: `ORD-${String(100_001 + i)}`,
      customerName: `${first} ${last}`,
      email: `${first}.${last}${int(1, 99)}@${pick(EMAIL_DOMAINS)}`
        .normalize('NFD')
        .replace(/\p{M}/gu, '')
        .toLowerCase(),
      status: weighted(STATUS_WEIGHTS),
      totalCents: subtotal + shippingCents,
      itemCount: lineItems.reduce((sum, li) => sum + li.quantity, 0),
      country,
      paymentMethod: weighted(PAYMENT_WEIGHTS),
      createdAt: new Date(ts).toISOString(),
      lineItems,
      shippingCents,
      shippingAddress: {
        line1: `${int(1, 250)} ${pick(STREETS)}`,
        city: pick(CITIES[country]),
        postalCode: String(int(10000, 99999)),
        country,
      },
    };
  });
}

let cache: Order[] | undefined;

/** Lazily generated, memoised dataset used by the mock handlers. */
export function getOrders(): Order[] {
  cache ??= generateOrders();
  return cache;
}
