import Stripe from 'stripe';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import shopify from '../api/checkout/shopify';
import stripeRoute from '../api/checkout/stripe';
import paypalCreate from '../api/checkout/paypal/create';
import paypalCapture from '../api/checkout/paypal/capture';
import webhook from '../api/webhooks/stripe';
import config from '../api/config';
import { fakeFetch, req, res } from './helpers';

const DAY = 47813083300088;
const MONTHLY = 2995224824;
const KEYS = ['SHOPIFY_STOREFRONT_TOKEN', 'SHOPIFY_ADMIN_TOKEN', 'SHOPIFY_ADMIN_DOMAIN', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET', 'PAYPAL_ENV', 'FLAT_SHIPPING_CENTS', 'FREE_SHIPPING_FROM_CENTS', 'SITE_URL'];
let saved: Record<string, string | undefined>;
beforeEach(() => { saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]])); KEYS.forEach((k) => delete process.env[k]); });
afterEach(() => { KEYS.forEach((k) => (saved[k] === undefined ? delete process.env[k] : (process.env[k] = saved[k]))); });

describe('config', () => {
  it('reports only Shopify without keys', () => {
    const r = res(); config(req('GET'), r);
    expect(r.captured.body.checkouts).toMatchObject({ shopify: true, shopifySubscriptions: false, stripe: false, paypal: false, recordsInShopify: false });
    expect(r.captured.body.shipping).toEqual({ freeFrom: 6000, flatRate: 0 });
  });
  it('never sends a secret', () => {
    Object.assign(process.env, { STRIPE_SECRET_KEY: 'sk_test_SECRET', PAYPAL_CLIENT_ID: 'pid', PAYPAL_CLIENT_SECRET: 'pp_SECRET', SHOPIFY_ADMIN_TOKEN: 'shpat_SECRET', SHOPIFY_ADMIN_DOMAIN: 'x.myshopify.com' });
    const r = res(); config(req('GET'), r);
    expect(JSON.stringify(r.captured.body)).not.toMatch(/SECRET/);
    expect(r.captured.body.checkouts).toMatchObject({ stripe: true, paypal: true, paypalClientId: 'pid', recordsInShopify: true });
  });
});

describe('Shopify checkout', () => {
  it('without a token, answers a cart permalink for a one-time bag', async () => {
    const r = res(); await shopify(req('POST', { lines: [{ variantId: DAY, quantity: 2 }] }), r);
    expect(r.captured).toMatchObject({ status: 200, body: { url: `https://baraguz.com/cart/${DAY}:2` } });
  });
  it('without a token, refuses a subscription', async () => {
    const r = res(); await shopify(req('POST', { lines: [{ variantId: DAY, quantity: 1, sellingPlanId: MONTHLY }] }), r);
    expect(r.captured.status).toBe(409);
  });
  it('with a token, creates a Storefront cart carrying the plan', async () => {
    process.env.SHOPIFY_STOREFRONT_TOKEN = 'tok';
    const { f, calls } = fakeFetch([[/graphql\.json$/, () => ({ json: { data: { cartCreate: { cart: { id: 'c1', checkoutUrl: 'https://baraguz.com/cart/c/abc' }, userErrors: [] } } } })]]);
    const r = res(); await shopify(req('POST', { lines: [{ variantId: DAY, quantity: 1, sellingPlanId: MONTHLY }] }), r, f);
    expect(r.captured.body.url).toBe('https://baraguz.com/cart/c/abc');
    const sent = JSON.parse(String(calls[0].init?.body));
    expect(sent.variables.input.lines[0].sellingPlanId).toBe(`gid://shopify/SellingPlan/${MONTHLY}`);
    expect((calls[0].init?.headers as Record<string, string>)['X-Shopify-Storefront-Access-Token']).toBe('tok');
  });
  it("passes Shopify's user error on", async () => {
    process.env.SHOPIFY_STOREFRONT_TOKEN = 'tok';
    const { f } = fakeFetch([[/graphql/, () => ({ json: { data: { cartCreate: { cart: null, userErrors: [{ message: 'Selling plan not available' }] } } } })]]);
    const r = res(); await shopify(req('POST', { lines: [{ variantId: DAY, quantity: 1 }] }), r, f);
    expect(r.captured).toMatchObject({ status: 502, body: { error: 'Selling plan not available' } });
  });
  it('refuses an unknown variant before calling Shopify', async () => {
    const r = res(); await shopify(req('POST', { lines: [{ variantId: 123, quantity: 1 }] }), r);
    expect(r.captured.status).toBe(400);
  });
  it('answers 405 to GET', async () => {
    const r = res(); await shopify(req('GET'), r);
    expect(r.captured.status).toBe(405);
  });
});

describe('Stripe checkout', () => {
  it('is off without a key', async () => {
    const r = res(); await stripeRoute(req('POST', { lines: [{ variantId: DAY, quantity: 1 }] }), r);
    expect(r.captured.status).toBe(503);
  });
  it('creates a session priced on the server, returning to this site', async () => {
    let seen: any;
    const r = res();
    await stripeRoute(req('POST', { lines: [{ variantId: DAY, quantity: 1, sellingPlanId: MONTHLY }] }), r, async (p) => { seen = p; return { url: 'https://checkout.stripe.com/c/pay/x' }; });
    expect(r.captured.body.url).toBe('https://checkout.stripe.com/c/pay/x');
    expect(seen.mode).toBe('subscription');
    expect(seen.line_items[0].price_data.unit_amount).toBe(4590);
    expect(seen.success_url).toBe('https://shop.example.test/thank-you?via=stripe&session={CHECKOUT_SESSION_ID}');
  });
  it('sends a gift card to Shopify', async () => {
    const r = res();
    await stripeRoute(req('POST', { lines: [{ variantId: 43436427837688, quantity: 1 }] }), r, async () => ({ url: 'x' }));
    expect(r.captured.status).toBe(409);
  });
});

describe('PayPal', () => {
  const on = () => Object.assign(process.env, { PAYPAL_CLIENT_ID: 'id', PAYPAL_CLIENT_SECRET: 'secret' });
  const token: [RegExp, () => { json: unknown }] = [/oauth2\/token$/, () => ({ json: { access_token: 'A' } })];

  it('creates an order in the sandbox by default', async () => {
    on();
    const { f, calls } = fakeFetch([token, [/checkout\/orders$/, () => ({ status: 201, json: { id: 'ORDER123' } })]]);
    const r = res(); await paypalCreate(req('POST', { lines: [{ variantId: DAY, quantity: 1 }] }), r, f);
    expect(r.captured.body).toEqual({ id: 'ORDER123' });
    expect(calls[1].url).toBe('https://api-m.sandbox.paypal.com/v2/checkout/orders');
  });
  it('refuses a subscription', async () => {
    on();
    const r = res(); await paypalCreate(req('POST', { lines: [{ variantId: DAY, quantity: 1, sellingPlanId: MONTHLY }] }), r, fakeFetch([]).f);
    expect(r.captured.status).toBe(409);
  });
  it('captures, rebuilding the cart from PayPal, and records the charge in Shopify', async () => {
    on(); Object.assign(process.env, { SHOPIFY_ADMIN_TOKEN: 'shpat', SHOPIFY_ADMIN_DOMAIN: 'baraguz.myshopify.com' });
    const items = [{ sku: String(DAY), quantity: '2' }];
    const { f, calls } = fakeFetch([
      token,
      [/orders\/ORDER123\/capture$/, () => ({ status: 201, json: { id: 'ORDER123', status: 'COMPLETED', payer: { email_address: 'p@example.test', name: { given_name: 'Pat', surname: 'Tester' } }, purchase_units: [{ shipping: { name: { full_name: 'Pat Tester' }, address: { address_line_1: '1 Test St', admin_area_2: 'Miami', admin_area_1: 'FL', postal_code: '33101', country_code: 'US' } }, payments: { captures: [{ amount: { value: '108.00' } }] } }] } })],
      [/orders\/ORDER123$/, () => ({ json: { id: 'ORDER123', status: 'APPROVED', purchase_units: [{ items }] } })],
      [/admin\/api\/2025-01\/orders\.json$/, () => ({ status: 201, json: { order: { id: 9 } } })],
    ]);
    const r = res(); await paypalCapture(req('POST', { orderId: 'ORDER123' }), r, f);
    expect(r.captured.body).toEqual({ status: 'COMPLETED', id: 'ORDER123', recordedInShopify: true });
    const order = JSON.parse(String(calls.at(-1)!.init?.body)).order;
    expect(order.line_items).toEqual([{ variant_id: DAY, quantity: 2, price: '54.00' }]);
    expect(order.transactions[0]).toMatchObject({ amount: '108.00', gateway: 'PayPal', authorization: 'ORDER123' });
    expect(order.shipping_address).toMatchObject({ city: 'Miami', province_code: 'FL' });
    // GET the order, then capture: never capture before the cart is checked.
    expect(calls.map((c) => c.url.replace(/^https:\/\/[^/]+/, ''))).toEqual(['/v1/oauth2/token', '/v2/checkout/orders/ORDER123', '/v1/oauth2/token', '/v2/checkout/orders/ORDER123/capture', '/admin/api/2025-01/orders.json']);
  });
  it('does not capture when a product sold out since the button opened', async () => {
    on();
    const { f, calls } = fakeFetch([token, [/orders\/ORDER123$/, () => ({ json: { id: 'ORDER123', purchase_units: [{ items: [{ sku: '43332955570424', quantity: '1' }] }] } })]]);
    const r = res(); await paypalCapture(req('POST', { orderId: 'ORDER123' }), r, f);
    expect(r.captured.status).toBe(409);
    expect(calls.some((c) => c.url.endsWith('/capture'))).toBe(false);
  });
  it('refuses a malformed order id', async () => {
    on();
    const r = res(); await paypalCapture(req('POST', { orderId: '../x' }), r, fakeFetch([]).f);
    expect(r.captured.status).toBe(400);
  });
});

describe('Stripe webhook', () => {
  const secret = 'whsec_test_secret';
  const signed = (event: unknown) => {
    const payload = JSON.stringify(event);
    const header = Stripe.webhooks.generateTestHeaderString({ payload, secret });
    return req('POST', payload, { 'stripe-signature': header });
  };
  const session = (metadata: Record<string, string>) => ({
    id: 'evt_1', object: 'event', type: 'checkout.session.completed',
    data: { object: { id: 'cs_test_1', object: 'checkout.session', amount_total: 4590 + 695, metadata, customer_details: { email: 'b@example.test', phone: '+15555550100', name: 'Bo Tester', address: { line1: '1 Test St', line2: null, city: 'Miami', state: 'FL', postal_code: '33101', country: 'US' } } } },
  });
  beforeEach(() => Object.assign(process.env, { STRIPE_SECRET_KEY: 'sk_test_x', STRIPE_WEBHOOK_SECRET: secret, SHOPIFY_ADMIN_TOKEN: 'shpat', SHOPIFY_ADMIN_DOMAIN: 'baraguz.myshopify.com', FLAT_SHIPPING_CENTS: '695' }));

  it('refuses a bad signature', async () => {
    const r = res(); await webhook(req('POST', '{}', { 'stripe-signature': 't=1,v1=bad' }), r, fakeFetch([]).f);
    expect(r.captured.status).toBe(400);
  });
  it('records the paid session in Shopify with the plan line and what Stripe charged', async () => {
    const { f, calls } = fakeFetch([[/orders\.json$/, () => ({ status: 201, json: { order: { id: 77 } } })]]);
    const r = res(); await webhook(signed(session({ cart_0: JSON.stringify([[DAY, 1, MONTHLY]]), source: 'baraguz-storefront' })), r, f);
    expect(r.captured).toMatchObject({ status: 200, body: { recorded: true, id: 77 } });
    const order = JSON.parse(String(calls[0].init?.body)).order;
    expect(order.line_items).toEqual([{ variant_id: DAY, quantity: 1, price: '45.90' }]);
    expect(order.transactions[0]).toMatchObject({ amount: '52.85', gateway: 'Stripe' });
    expect(order.tags).toContain('subscription');
  });
  it('answers 500 (Stripe retries) when Shopify refuses the order', async () => {
    const { f } = fakeFetch([[/orders\.json$/, () => ({ status: 422, json: { errors: { line_items: ['bad'] } } })]]);
    const r = res(); await webhook(signed(session({ cart_0: JSON.stringify([[DAY, 1, 0]]) })), r, f);
    expect(r.captured.status).toBe(500);
  });
  it('answers 500 for a session without a cart, without throwing', async () => {
    const r = res(); await webhook(signed(session({})), r, fakeFetch([]).f);
    expect(r.captured.status).toBe(500);
  });
  it('ignores other events', async () => {
    const r = res(); await webhook(signed({ id: 'evt_2', object: 'event', type: 'invoice.paid', data: { object: {} } }), r, fakeFetch([]).f);
    expect(r.captured).toMatchObject({ status: 200, body: { ignored: 'invoice.paid' } });
  });
});
