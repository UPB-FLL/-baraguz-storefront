import Stripe from 'stripe';
import { allow, jsonBody, originOf, send, type Req, type Res } from '../_lib/http.js';
import { env, shippingRules } from '../_lib/env.js';
import { catalog } from '../_lib/catalog.js';
import { CartError, priceCart, type CartLineInput } from '../../shared/pricing.js';
import { stripeSessionParams } from '../../shared/providers.js';

type SessionCreator = (params: ReturnType<typeof stripeSessionParams>) => Promise<{ url: string | null }>;

export function stripeCreator(): SessionCreator {
  const stripe = new Stripe(env.stripeSecret());
  return (params) => stripe.checkout.sessions.create(params as Stripe.Checkout.SessionCreateParams);
}

/** Stripe Checkout: cards, Apple Pay, Google Pay and Link; subscriptions billed by Stripe. */
export default async function handler(req: Req, res: Res, create: SessionCreator | null = null) {
  if (!allow(req, res, 'POST')) return;
  if (!env.stripeSecret() && !create) return send(res, 503, { error: 'Card checkout is not switched on.' });
  try {
    const { lines, email } = await jsonBody<{ lines: CartLineInput[]; email?: string }>(req);
    const cart = priceCart(catalog, lines, shippingRules());
    const origin = originOf(req);
    const params = stripeSessionParams(cart, {
      origin,
      successUrl: `${origin}/thank-you?via=stripe&session={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${origin}/cart`,
      email: typeof email === 'string' && /@/.test(email) ? email : null,
    });
    const session = await (create ?? stripeCreator())(params);
    if (!session.url) return send(res, 502, { error: 'Stripe did not return a checkout page.' });
    send(res, 200, { url: session.url });
  } catch (err) {
    if (err instanceof CartError) return send(res, err.status, { error: err.message });
    send(res, 502, { error: 'Could not start the card checkout.' });
  }
}
