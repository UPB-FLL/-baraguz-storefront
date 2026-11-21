import { allow, jsonBody, send, type Req, type Res } from '../_lib/http.js';
import { env, shippingRules } from '../_lib/env.js';
import { catalog } from '../_lib/catalog.js';
import { CartError, priceCart, type CartLineInput } from '../../shared/pricing.js';
import { CART_CREATE, shopifyCartInput, shopifyPermalink } from '../../shared/providers.js';

/**
 * Shopify checkout: Shop Pay, cards, PayPal and subscriptions (Seal), with the order landing in Shopify.
 * With SHOPIFY_STOREFRONT_TOKEN a Storefront API cart carries subscription plans; without it a cart
 * permalink still works for one-time purchases.
 */
export default async function handler(req: Req, res: Res, fetchImpl: typeof fetch = fetch) {
  if (!allow(req, res, 'POST')) return;
  try {
    const { lines } = await jsonBody<{ lines: CartLineInput[] }>(req);
    priceCart(catalog, lines, shippingRules()); // refuses what the catalog does not sell
    const token = env.storefrontToken();
    if (!token) {
      const url = shopifyPermalink(env.storeDomain(), lines);
      if (!url) return send(res, 409, { error: 'Subscriptions need the Shopify Storefront token. Choose a one-time purchase, or pay by card.' });
      return send(res, 200, { url });
    }
    const r = await fetchImpl(`https://${env.storeDomain()}/api/2025-01/graphql.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Shopify-Storefront-Access-Token': token },
      body: JSON.stringify({ query: CART_CREATE, variables: shopifyCartInput(lines, { source: 'baraguz-storefront' }) }),
    });
    const json = (await r.json()) as { data?: { cartCreate?: { cart?: { checkoutUrl: string }; userErrors?: { message: string }[] } }; errors?: { message: string }[] };
    const errs = json.errors ?? json.data?.cartCreate?.userErrors ?? [];
    const url = json.data?.cartCreate?.cart?.checkoutUrl;
    if (!r.ok || !url) return send(res, 502, { error: errs[0]?.message ?? `Shopify answered ${r.status}.` });
    send(res, 200, { url });
  } catch (err) {
    if (err instanceof CartError) return send(res, err.status, { error: err.message });
    send(res, 500, { error: 'Could not start the Shopify checkout.' });
  }
}
