import type { ShippingRules } from '../../shared/pricing.js';

/** Settings from the environment. A checkout without its settings is reported off, never half-on. */
export const env = {
  storeDomain: () => process.env.SHOPIFY_STORE_DOMAIN || 'baraguz.com',
  storefrontToken: () => process.env.SHOPIFY_STOREFRONT_TOKEN || '',
  adminToken: () => process.env.SHOPIFY_ADMIN_TOKEN || '',
  adminDomain: () => process.env.SHOPIFY_ADMIN_DOMAIN || '',
  stripeSecret: () => process.env.STRIPE_SECRET_KEY || '',
  stripeWebhookSecret: () => process.env.STRIPE_WEBHOOK_SECRET || '',
  paypalClientId: () => process.env.PAYPAL_CLIENT_ID || '',
  paypalSecret: () => process.env.PAYPAL_CLIENT_SECRET || '',
  paypalBase: () => (process.env.PAYPAL_ENV === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com'),
};

/** Shipping for Stripe and PayPal orders. Shopify's checkout uses the store's own rates. */
export function shippingRules(): ShippingRules {
  const n = (v: string | undefined, d: number) => (v !== undefined && v !== '' && Number.isFinite(Number(v)) ? Math.round(Number(v)) : d);
  return { freeFrom: n(process.env.FREE_SHIPPING_FROM_CENTS, 6000), flatRate: n(process.env.FLAT_SHIPPING_CENTS, 0) };
}

export function enabledCheckouts() {
  return {
    shopify: true,
    shopifySubscriptions: Boolean(env.storefrontToken()),
    stripe: Boolean(env.stripeSecret()),
    paypal: Boolean(env.paypalClientId() && env.paypalSecret()),
    paypalClientId: env.paypalClientId() || null,
    paypalEnv: process.env.PAYPAL_ENV === 'live' ? 'live' : 'sandbox',
    recordsInShopify: Boolean(env.adminToken() && env.adminDomain()),
  };
}
