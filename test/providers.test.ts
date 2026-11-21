import { describe, expect, it } from 'vitest';
import catalogJson from '../src/data/catalog.json';
import type { Catalog } from '../shared/catalog';
import { priceCart } from '../shared/pricing';
import {
  cartFromMetadata, cartFromPaypalItems, cartMetadata, PayPalUnsupported, paypalOrderBody,
  shopifyCartInput, shopifyOrderBody, shopifyPermalink, stripeSessionParams,
} from '../shared/providers';

const catalog = catalogJson as unknown as Catalog;
const rules = { freeFrom: 6000, flatRate: 695 };
const DAY = 47813083300088;
const MONTHLY = 2995224824;
const THYROID = 48701312401656;
const GIFT = 43436427837688;
const opts = { successUrl: 'https://s.test/ok', cancelUrl: 'https://s.test/cart', origin: 'https://s.test' };
const available = catalog.products.flatMap((p) => p.variants.filter((v) => v.available && !/gift/i.test(p.type)).map((v) => v.id));

describe('Shopify', () => {
  it('sends Shopify ids, with the selling plan on a subscription line', () => {
    const { input } = shopifyCartInput([{ variantId: DAY, quantity: 2, sellingPlanId: MONTHLY }, { variantId: THYROID, quantity: 1 }], { source: 'x' });
    expect(input.lines[0]).toEqual({ merchandiseId: `gid://shopify/ProductVariant/${DAY}`, quantity: 2, sellingPlanId: `gid://shopify/SellingPlan/${MONTHLY}` });
    expect(input.lines[1]).toEqual({ merchandiseId: `gid://shopify/ProductVariant/${THYROID}`, quantity: 1 });
    expect(input.attributes).toEqual([{ key: 'source', value: 'x' }]);
  });
  it('builds a cart permalink for one-time carts and refuses one with a plan', () => {
    expect(shopifyPermalink('baraguz.com', [{ variantId: DAY, quantity: 2 }, { variantId: THYROID, quantity: 1 }])).toBe(`https://baraguz.com/cart/${DAY}:2,${THYROID}:1`);
    expect(shopifyPermalink('baraguz.com', [{ variantId: DAY, quantity: 1, sellingPlanId: MONTHLY }])).toBeNull();
  });
});

describe('Stripe', () => {
  it('runs a one-time cart in payment mode with a shipping option', () => {
    const p = stripeSessionParams(priceCart(catalog, [{ variantId: DAY, quantity: 1 }], rules), opts);
    expect(p.mode).toBe('payment');
    expect(p.line_items).toHaveLength(1);
    expect(p.line_items[0].price_data.unit_amount).toBe(5400);
    expect('recurring' in p.line_items[0].price_data).toBe(false);
    expect(p.shipping_options?.[0].shipping_rate_data.fixed_amount.amount).toBe(695);
  });
  it('runs a subscription cart in subscription mode, the plan recurring and shipping as a one-time line', () => {
    const p = stripeSessionParams(priceCart(catalog, [{ variantId: DAY, quantity: 1, sellingPlanId: 3015016696 }], rules), opts);
    expect(p.mode).toBe('subscription');
    expect(p.line_items[0].price_data).toMatchObject({ unit_amount: 4968, recurring: { interval: 'month', interval_count: 2 } });
    expect(p.line_items).toHaveLength(2);
    expect(p.line_items[1].price_data).toMatchObject({ unit_amount: 695 });
    expect(p.shipping_options).toBeUndefined();
  });
  it('carries a full 30-line bag in metadata and reads it back', () => {
    const lines = available.slice(0, 30).map((variantId, i) => ({ variantId, quantity: (i % 3) + 1 }));
    const cart = priceCart(catalog, lines, rules);
    const meta = cartMetadata(cart);
    for (const v of Object.values(meta)) expect(v.length).toBeLessThanOrEqual(500);
    expect(Object.keys(meta).length).toBeGreaterThan(1);
    expect(cartFromMetadata(meta)).toEqual(lines.map((l) => ({ ...l, sellingPlanId: null })));
    const p = stripeSessionParams(cart, opts);
    expect(Object.keys(p.metadata).length).toBeLessThanOrEqual(50);
  });
  it('round-trips the plan id', () => {
    const cart = priceCart(catalog, [{ variantId: DAY, quantity: 1, sellingPlanId: MONTHLY }], rules);
    expect(cartFromMetadata(cartMetadata(cart))).toEqual([{ variantId: DAY, quantity: 1, sellingPlanId: MONTHLY }]);
  });
  it('refuses a gift card', () => {
    expect(() => stripeSessionParams(priceCart(catalog, [{ variantId: GIFT, quantity: 1 }], rules), opts)).toThrow(/Gift cards/);
  });
});

describe('PayPal', () => {
  it('builds an order whose breakdown adds up', () => {
    const body = paypalOrderBody(priceCart(catalog, [{ variantId: DAY, quantity: 1 }], rules));
    const u = body.purchase_units[0];
    expect(u.amount).toMatchObject({ value: '60.95', breakdown: { item_total: { value: '54.00' }, shipping: { value: '6.95' } } });
    expect(u.items[0]).toMatchObject({ sku: String(DAY), quantity: '1', unit_amount: { value: '54.00' } });
  });
  it('rebuilds a 30-line cart from the order items', () => {
    const lines = available.slice(0, 30).map((variantId) => ({ variantId, quantity: 2 }));
    const body = paypalOrderBody(priceCart(catalog, lines, rules));
    expect(cartFromPaypalItems(body.purchase_units[0].items)).toEqual(lines);
  });
  it('refuses subscriptions and gift cards', () => {
    expect(() => paypalOrderBody(priceCart(catalog, [{ variantId: DAY, quantity: 1, sellingPlanId: MONTHLY }], rules))).toThrow(PayPalUnsupported);
    expect(() => paypalOrderBody(priceCart(catalog, [{ variantId: GIFT, quantity: 1 }], rules))).toThrow(PayPalUnsupported);
  });
});

describe('Shopify order record', () => {
  const contact = { email: 'buyer@example.test', name: 'Jordan Q Tester', phone: null, address: { line1: '1 Test St', line2: null, city: 'Miami', state: 'FL', postal_code: '33101', country: 'US' } };
  it('records a paid order with the variant, price and shipping', () => {
    const { order } = shopifyOrderBody(priceCart(catalog, [{ variantId: DAY, quantity: 2 }], rules), 'stripe', 'cs_test_1', contact);
    expect(order.financial_status).toBe('paid');
    expect(order.line_items).toEqual([{ variant_id: DAY, quantity: 2, price: '54.00' }]);
    expect(order.shipping_lines[0]).toMatchObject({ price: '0.00', title: 'Free U.S. shipping' });
    expect(order.transactions[0]).toMatchObject({ amount: '108.00', gateway: 'Stripe', authorization: 'cs_test_1' });
    expect(order.shipping_address).toMatchObject({ first_name: 'Jordan', last_name: 'Q Tester', province_code: 'FL' });
  });
  it('records what was charged when the catalog price moved, and says so', () => {
    const { order } = shopifyOrderBody(priceCart(catalog, [{ variantId: DAY, quantity: 2 }], rules), 'paypal', 'PP1', contact, 9900);
    expect(order.transactions[0].amount).toBe('99.00');
    expect(order.note).toMatch(/Charged 99.00; catalog total now 108.00/);
  });
});
