import Stripe from 'stripe';
import { rawBody, send, type Req, type Res } from '../_lib/http.js';
import { env, shippingRules } from '../_lib/env.js';
import { catalog } from '../_lib/catalog.js';
import { recordShopifyOrder } from '../_lib/shopifyAdmin.js';
import { priceCart } from '../../shared/pricing.js';
import { cartFromMetadata, shopifyOrderBody } from '../../shared/providers.js';

export const config = { api: { bodyParser: false } };

/**
 * Stripe → Shopify: on checkout.session.completed (signature verified), records the sale as a paid Shopify order.
 * Point the Stripe webhook at /api/webhooks/stripe with that one event.
 */
export default async function handler(req: Req, res: Res, fetchImpl: typeof fetch = fetch) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Use POST.' });
  const secret = env.stripeWebhookSecret();
  if (!secret || !env.stripeSecret()) return send(res, 503, { error: 'Stripe webhook is not configured.' });
  const stripe = new Stripe(env.stripeSecret());
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(await rawBody(req), String(req.headers['stripe-signature'] ?? ''), secret);
  } catch {
    return send(res, 400, { error: 'Bad signature.' });
  }
  if (event.type !== 'checkout.session.completed') return send(res, 200, { ignored: event.type });
  const s = event.data.object as Stripe.Checkout.Session;
  try {
    const lines = cartFromMetadata(s.metadata);
    // Already paid: price it even if a variant sold out since; the transaction records what Stripe charged.
    const cart = priceCart(catalog, lines, shippingRules(), { ignoreStock: true });
    const ship = s.shipping_details ?? s.customer_details;
    const result = await recordShopifyOrder(
      shopifyOrderBody(cart, 'stripe', s.id, {
        email: s.customer_details?.email ?? null,
        name: ship?.name ?? null,
        phone: s.customer_details?.phone ?? null,
        address: ship?.address ? { line1: ship.address.line1, line2: ship.address.line2, city: ship.address.city, state: ship.address.state, postal_code: ship.address.postal_code, country: ship.address.country } : null,
      }, s.amount_total ?? cart.total),
      fetchImpl,
    );
    // Not configured: nothing to retry. A refused record answers 500 so Stripe retries and the dashboard shows it.
    send(res, result.recorded || result.error?.includes('not set') ? 200 : 500, result);
  } catch (err) {
    console.error('Stripe sale not recorded in Shopify', s.id, err);
    send(res, 500, { recorded: false, error: 'The session could not be read back into a cart.' });
  }
}
