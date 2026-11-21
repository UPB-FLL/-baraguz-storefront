import { useEffect, useState } from 'react';

export interface CheckoutConfig {
  checkouts: { shopify: boolean; shopifySubscriptions: boolean; stripe: boolean; paypal: boolean; paypalClientId: string | null; paypalEnv: 'live' | 'sandbox'; recordsInShopify: boolean };
  shipping: { freeFrom: number; flatRate: number };
}

/** Before the server answers (or on a static host with no API), only Shopify's checkout is offered. */
export const FALLBACK: CheckoutConfig = {
  checkouts: { shopify: true, shopifySubscriptions: false, stripe: false, paypal: false, paypalClientId: null, paypalEnv: 'sandbox', recordsInShopify: false },
  shipping: { freeFrom: 6000, flatRate: 0 },
};

let cached: Promise<CheckoutConfig> | null = null;
export function loadConfig(): Promise<CheckoutConfig> {
  cached ??= fetch('/api/config').then((r) => (r.ok ? r.json() : FALLBACK)).catch(() => FALLBACK);
  return cached;
}

export function useConfig(): CheckoutConfig {
  const [c, setC] = useState<CheckoutConfig>(FALLBACK);
  useEffect(() => { loadConfig().then(setC); }, []);
  return c;
}
