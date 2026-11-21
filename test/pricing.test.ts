import { describe, expect, it } from 'vitest';
import catalogJson from '../src/data/catalog.json';
import type { Catalog } from '../shared/catalog';
import { CartError, MAX_LINES, priceCart } from '../shared/pricing';

const catalog = catalogJson as unknown as Catalog;
const rules = { freeFrom: 6000, flatRate: 695 };
const DAY = 47813083300088; // SlimT Day Booster, $54.00, plans 15/8/5 %
const MONTHLY = 2995224824;
const THYROID = 48701312401656; // $59.95, no subscription
const SOLD_OUT = 43332955570424;

describe('priceCart', () => {
  it('prices from the catalog, not from the browser', () => {
    const cart = priceCart(catalog, [{ variantId: DAY, quantity: 1, price: 1 } as never], rules);
    expect(cart.lines[0].unitPrice).toBe(5400);
    expect(cart.subtotal).toBe(5400);
  });

  it('takes the plan discount Shopify states (15% monthly: $54.00 → $45.90)', () => {
    const cart = priceCart(catalog, [{ variantId: DAY, quantity: 2, sellingPlanId: MONTHLY }], rules);
    expect(cart.lines[0].unitPrice).toBe(4590);
    expect(cart.lines[0].lineCompare).toBe(10800);
    expect(cart.hasSubscription).toBe(true);
  });

  it('charges the flat rate below the threshold and nothing from it', () => {
    const below = priceCart(catalog, [{ variantId: DAY, quantity: 1 }], rules);
    expect(below.shipping).toBe(695);
    expect(below.total).toBe(6095);
    expect(below.toFreeShipping).toBe(600);
    const above = priceCart(catalog, [{ variantId: DAY, quantity: 1 }, { variantId: THYROID, quantity: 1 }], rules);
    expect(above.subtotal).toBe(11395);
    expect(above.shipping).toBe(0);
    expect(above.toFreeShipping).toBe(0);
  });

  it('refuses what the catalog does not sell', () => {
    const bad = (lines: unknown, msg: RegExp) => expect(() => priceCart(catalog, lines as never, rules)).toThrow(msg);
    bad([], /empty/);
    bad([{ variantId: 1, quantity: 1 }], /no longer sold/);
    bad([{ variantId: DAY, quantity: 0 }], /Quantities/);
    bad([{ variantId: DAY, quantity: 21 }], /Quantities/);
    bad([{ variantId: DAY, quantity: 1.5 }], /Quantities/);
    bad([{ variantId: 'x', quantity: 1 }], /no product/);
    bad([{ variantId: THYROID, quantity: 1, sellingPlanId: MONTHLY }], /not offered/);
    bad([{ variantId: SOLD_OUT, quantity: 1 }], /sold out/);
    bad(Array.from({ length: MAX_LINES + 1 }, () => ({ variantId: DAY, quantity: 1 })), /Too many/);
    expect(() => priceCart(catalog, [], rules)).toThrow(CartError);
  });

  it('prices a sold-out line when recording a sale already paid', () => {
    const cart = priceCart(catalog, [{ variantId: SOLD_OUT, quantity: 1 }], rules, { ignoreStock: true });
    expect(cart.lines).toHaveLength(1);
  });

  it('marks a gift card', () => {
    expect(priceCart(catalog, [{ variantId: 43436427837688, quantity: 1 }], rules).hasGiftCard).toBe(true);
    expect(priceCart(catalog, [{ variantId: DAY, quantity: 1 }], rules).hasGiftCard).toBe(false);
  });
});
