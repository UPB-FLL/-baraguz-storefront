import { CartError, type CartLineInput, type PricedCart } from './pricing.js';

export const GIFT_CARD_SHOPIFY_ONLY = 'Gift cards check out through Shopify, which issues the card.';

/**
 * Request bodies for the three checkouts, built from a priced cart.
 * Pure functions: the API routes send them, the tests read them.
 */

// ---------------------------------------------------------------- Shopify (Shop Pay, cards, PayPal, subscriptions)

export const CART_CREATE = `mutation CartCreate($input: CartInput!) {
  cartCreate(input: $input) {
    cart { id checkoutUrl }
    userErrors { field message }
  }
}`;

/** Storefront API cartCreate variables. Subscription lines carry Shopify's selling plan, so Seal Subscriptions takes them as usual. */
export function shopifyCartInput(lines: CartLineInput[], attributes: Record<string, string> = {}) {
  return {
    input: {
      lines: lines.map((l) => ({
        merchandiseId: `gid://shopify/ProductVariant/${l.variantId}`,
        quantity: l.quantity,
        ...(l.sellingPlanId ? { sellingPlanId: `gid://shopify/SellingPlan/${l.sellingPlanId}` } : {}),
      })),
      attributes: Object.entries(attributes).map(([key, value]) => ({ key, value })),
    },
  };
}

/**
 * Without a Storefront token, Shopify's cart permalink still reaches its checkout (Shop Pay, cards, PayPal)
 * for one-time purchases. Permalinks cannot carry a subscription, so a cart with one needs the token.
 */
export function shopifyPermalink(storeDomain: string, lines: CartLineInput[]): string | null {
  if (lines.some((l) => l.sellingPlanId)) return null;
  const items = lines.map((l) => `${l.variantId}:${l.quantity}`).join(',');
  return `https://${storeDomain}/cart/${items}`;
}

// ---------------------------------------------------------------- Stripe Checkout (cards, Apple Pay, Google Pay, Link)

export interface StripeOptions {
  successUrl: string;
  cancelUrl: string;
  email?: string | null;
  /** Absolute origin of the storefront, for product images given as site paths. */
  origin: string;
}

/**
 * Stripe Checkout Session parameters. A cart with a subscription runs in subscription mode: the
 * subscription lines recur at their plan's interval, one-time lines are charged on the first invoice.
 * The cart itself rides in metadata so the webhook can record the order in Shopify.
 */
export function stripeSessionParams(cart: PricedCart, o: StripeOptions) {
  if (cart.hasGiftCard) throw new CartError(GIFT_CARD_SHOPIFY_ONLY, 409);
  const image = (src: string | undefined) => (src ? [src.startsWith('http') ? src : `${o.origin}${src}`] : undefined);
  const line_items = cart.lines.map((l) => ({
    quantity: l.quantity,
    price_data: {
      currency: 'usd',
      unit_amount: l.unitPrice,
      product_data: {
        name: l.variant.title === 'Default Title' ? l.product.title : `${l.product.title} (${l.variant.title})`,
        images: image(l.product.images[0]?.src),
        metadata: { variant_id: String(l.variant.id), handle: l.product.handle },
      },
      ...(l.plan ? { recurring: { interval: l.plan.interval, interval_count: l.plan.intervalCount } } : {}),
    },
  }));
  const shipping = {
    shipping_rate_data: {
      display_name: cart.shipping === 0 ? 'Free U.S. shipping' : 'U.S. shipping',
      type: 'fixed_amount' as const,
      fixed_amount: { amount: cart.shipping, currency: 'usd' },
    },
  };
  const subscription = cart.hasSubscription;
  return {
    mode: subscription ? ('subscription' as const) : ('payment' as const),
    line_items,
    success_url: o.successUrl,
    cancel_url: o.cancelUrl,
    ...(o.email ? { customer_email: o.email } : {}),
    shipping_address_collection: { allowed_countries: ['US' as const] },
    // Stripe takes shipping options in payment mode; in subscription mode the shipping is a one-time line.
    ...(subscription
      ? {}
      : { shipping_options: [shipping] }),
    ...(subscription && cart.shipping > 0
      ? { line_items: [...line_items, { quantity: 1, price_data: { currency: 'usd', unit_amount: cart.shipping, product_data: { name: 'U.S. shipping' } } }] }
      : {}),
    phone_number_collection: { enabled: true },
    metadata: { ...cartMetadata(cart), source: 'baraguz-storefront' },
  };
}

/** Stripe metadata values hold 500 characters, so the cart is split over cart_0, cart_1, … (a 30-line bag fits). */
export const METADATA_CHUNK = 480;
export function cartMetadata(cart: PricedCart): Record<string, string> {
  const json = JSON.stringify(cart.lines.map((l) => [l.variant.id, l.quantity, l.plan?.id ?? 0]));
  const out: Record<string, string> = {};
  for (let i = 0; i * METADATA_CHUNK < json.length; i++) out[`cart_${i}`] = json.slice(i * METADATA_CHUNK, (i + 1) * METADATA_CHUNK);
  return out;
}

/** The cart a Checkout Session was created for, read back in the webhook. */
export function cartFromMetadata(meta: Record<string, string> | null | undefined): CartLineInput[] {
  const parts: string[] = [];
  for (let i = 0; meta && meta[`cart_${i}`] !== undefined; i++) parts.push(meta[`cart_${i}`]);
  if (!parts.length) throw new Error('The session carries no cart.');
  return (JSON.parse(parts.join('')) as [number, number, number][]).map(([variantId, quantity, plan]) => ({ variantId, quantity, sellingPlanId: plan || null }));
}

// ---------------------------------------------------------------- PayPal Orders v2

export class PayPalUnsupported extends Error {}

/** A PayPal order for a one-time cart. Subscriptions go through Shopify or Stripe (PayPal plans are not set up). */
export function paypalOrderBody(cart: PricedCart) {
  if (cart.hasGiftCard) throw new PayPalUnsupported(GIFT_CARD_SHOPIFY_ONLY);
  if (cart.hasSubscription) throw new PayPalUnsupported('PayPal takes one-time purchases here. Use Shopify checkout or a card for a subscription.');
  const value = (c: number) => (c / 100).toFixed(2);
  return {
    intent: 'CAPTURE',
    purchase_units: [
      {
        amount: {
          currency_code: 'USD',
          value: value(cart.total),
          breakdown: { item_total: { currency_code: 'USD', value: value(cart.subtotal) }, shipping: { currency_code: 'USD', value: value(cart.shipping) } },
        },
        items: cart.lines.map((l) => ({
          name: l.product.title.slice(0, 127),
          // The variant id, so the capture can rebuild the cart from PayPal's own copy of the order.
          sku: String(l.variant.id),
          quantity: String(l.quantity),
          unit_amount: { currency_code: 'USD', value: value(l.unitPrice) },
          category: 'PHYSICAL_GOODS',
        })),
        custom_id: 'baraguz-storefront',
      },
    ],
    payment_source: { paypal: { experience_context: { shipping_preference: 'GET_FROM_FILE', user_action: 'PAY_NOW', brand_name: 'Baraguz' } } },
  };
}

/** The cart behind a PayPal order, from its items (sku = variant id). */
export function cartFromPaypalItems(items: { sku?: string; quantity?: string }[] | undefined): CartLineInput[] {
  if (!items?.length) throw new Error('The PayPal order has no items.');
  return items.map((i) => ({ variantId: Number(i.sku), quantity: Number(i.quantity) }));
}

// ---------------------------------------------------------------- Shopify Admin: record a Stripe or PayPal sale

export interface OrderContact {
  email: string | null;
  name: string | null;
  phone: string | null;
  address: { line1: string | null; line2: string | null; city: string | null; state: string | null; postal_code: string | null; country: string | null } | null;
}

/** An Admin REST order marked paid, so Shopify fulfils and reports a sale taken outside its checkout. */
/**
 * paidTotal is what the customer was actually charged, in cents (the processor's figure). When it differs
 * from today's catalog price the order says so, and the transaction records the charge.
 */
export function shopifyOrderBody(cart: PricedCart, gateway: 'stripe' | 'paypal', reference: string, c: OrderContact, paidTotal: number = cart.total) {
  const drift = paidTotal !== cart.total ? ` Charged ${(paidTotal / 100).toFixed(2)}; catalog total now ${(cart.total / 100).toFixed(2)}.` : '';
  const [first, ...rest] = (c.name ?? '').trim().split(/\s+/);
  const address = c.address && {
    first_name: first || null,
    last_name: rest.join(' ') || null,
    address1: c.address.line1,
    address2: c.address.line2,
    city: c.address.city,
    province_code: c.address.state,
    zip: c.address.postal_code,
    country_code: c.address.country,
    phone: c.phone,
  };
  return {
    order: {
      email: c.email,
      phone: c.phone,
      financial_status: 'paid',
      send_receipt: true,
      inventory_behaviour: 'decrement_obeying_policy',
      source_name: 'baraguz-storefront',
      tags: `storefront, ${gateway}${cart.hasSubscription ? ', subscription' : ''}`,
      note: `Paid by ${gateway === 'stripe' ? 'Stripe' : 'PayPal'} (${reference}).${cart.hasSubscription ? ' Subscription billed by Stripe.' : ''}${drift}`,
      line_items: cart.lines.map((l) => ({ variant_id: l.variant.id, quantity: l.quantity, price: (l.unitPrice / 100).toFixed(2) })),
      shipping_lines: [{ title: cart.shipping === 0 ? 'Free U.S. shipping' : 'U.S. shipping', price: (cart.shipping / 100).toFixed(2), code: 'STANDARD' }],
      transactions: [{ kind: 'sale', status: 'success', amount: (paidTotal / 100).toFixed(2), gateway: gateway === 'stripe' ? 'Stripe' : 'PayPal', authorization: reference }],
      ...(address ? { shipping_address: address, billing_address: address } : {}),
    },
  };
}
