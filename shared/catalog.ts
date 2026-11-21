/** The catalog as imported from Shopify (scripts/import-catalog.mjs). Money is in cents. */

export interface SellingPlan {
  /** Shopify's selling plan id (Seal Subscriptions' plans live in Shopify). */
  id: number;
  name: string;
  /** Percentage off the variant price, as the plan's price adjustment says. */
  percentOff: number;
  /** Delivery interval, read from the plan name ("Every 2 Months" → 2 months). */
  interval: 'month';
  intervalCount: number;
}

export interface Variant {
  id: number;
  title: string;
  options: string[];
  price: number;
  compareAtPrice: number | null;
  available: boolean;
  sku: string | null;
}

export interface Product {
  id: number;
  handle: string;
  title: string;
  vendor: string;
  type: string;
  tags: string[];
  descriptionHtml: string;
  images: { src: string; alt: string; width: number | null; height: number | null }[];
  options: { name: string; values: string[] }[];
  variants: Variant[];
  sellingPlans: SellingPlan[];
  requiresSellingPlan: boolean;
}

export interface Collection {
  handle: string;
  title: string;
  productHandles: string[];
}

export interface Catalog {
  importedAt: string;
  source: string;
  currency: 'USD';
  products: Product[];
  collections: Collection[];
}

export interface Review {
  id: string;
  productHandle: string;
  rating: number;
  title: string;
  body: string;
  /** First name and last initial only; emails are never imported. */
  author: string;
  date: string;
  verified: boolean;
  reply: string | null;
  photos: string[];
}

export const productUrl = (handle: string) => `/products/${handle}`;
export const collectionUrl = (handle: string) => `/collections/${handle}`;

export function formatMoney(cents: number): string {
  return `$${(cents / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

/** The best subscription discount a product offers, or 0. */
export function bestPercentOff(p: Product): number {
  return p.sellingPlans.reduce((m, s) => Math.max(m, s.percentOff), 0);
}

/** A price after a percentage discount, rounded to the cent the way Shopify rounds (half up). */
export function discounted(price: number, percentOff: number): number {
  return Math.round((price * (100 - percentOff)) / 100);
}

/** Shopify issues a gift card only from its own checkout, so these never go through Stripe or PayPal. */
export const isGiftCard = (p: Pick<Product, 'type' | 'handle'>): boolean => /gift ?card/i.test(p.type) || /(^|-)gift-card($|-)/.test(p.handle);
