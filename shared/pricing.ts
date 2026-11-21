import { discounted, isGiftCard, type Catalog, type Product, type SellingPlan, type Variant } from './catalog.js';

/**
 * What a shopper sends (from the browser) and what every checkout prices.
 * The browser only ever names a variant, a quantity and a plan id; every amount is
 * recomputed here from the catalog, on the server, so a tampered cart cannot change a price.
 */
export interface CartLineInput {
  variantId: number;
  quantity: number;
  sellingPlanId?: number | null;
}

export interface PricedLine {
  product: Product;
  variant: Variant;
  quantity: number;
  plan: SellingPlan | null;
  unitPrice: number;
  lineTotal: number;
  /** What the line would cost without the subscription discount. */
  lineCompare: number;
}

export interface ShippingRules {
  /** Free shipping from this subtotal, in cents (Baraguz: $60). 0 turns free shipping off. */
  freeFrom: number;
  /** Flat U.S. rate below the threshold, in cents. Set it to match the Shopify store's rate. */
  flatRate: number;
}

export interface PricedCart {
  lines: PricedLine[];
  subtotal: number;
  shipping: number;
  total: number;
  itemCount: number;
  hasSubscription: boolean;
  /** A Shopify gift card is in the bag: only Shopify's checkout can issue it. */
  hasGiftCard: boolean;
  /** Cents still needed for free shipping (0 once reached). */
  toFreeShipping: number;
}

export class CartError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
  }
}

export const MAX_QUANTITY = 20;
export const MAX_LINES = 30;

export function findVariant(catalog: Catalog, variantId: number): { product: Product; variant: Variant } | null {
  for (const product of catalog.products) {
    const variant = product.variants.find((v) => v.id === variantId);
    if (variant) return { product, variant };
  }
  return null;
}

/** Prices a cart from the catalog; refuses anything the catalog does not sell. */
export interface PriceOptions {
  /** Recording a sale already paid: a variant that sold out since is still priced, never refused. */
  ignoreStock?: boolean;
}

export function priceCart(catalog: Catalog, input: CartLineInput[], rules: ShippingRules, opts: PriceOptions = {}): PricedCart {
  if (!Array.isArray(input) || input.length === 0) throw new CartError('The bag is empty.');
  if (input.length > MAX_LINES) throw new CartError('Too many lines in the bag.');
  const lines: PricedLine[] = input.map((raw) => {
    const variantId = Number(raw?.variantId);
    const quantity = Number(raw?.quantity);
    if (!Number.isInteger(variantId)) throw new CartError('A line has no product.');
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) throw new CartError(`Quantities run from 1 to ${MAX_QUANTITY}.`);
    const found = findVariant(catalog, variantId);
    if (!found) throw new CartError('A product in the bag is no longer sold.');
    const { product, variant } = found;
    if (!variant.available && !opts.ignoreStock) throw new CartError(`${product.title} is sold out.`);
    let plan: SellingPlan | null = null;
    if (raw.sellingPlanId !== undefined && raw.sellingPlanId !== null) {
      plan = product.sellingPlans.find((s) => s.id === Number(raw.sellingPlanId)) ?? null;
      if (!plan) throw new CartError(`That subscription is not offered on ${product.title}.`);
    } else if (product.requiresSellingPlan) {
      throw new CartError(`${product.title} is sold by subscription only.`);
    }
    const unitPrice = plan ? discounted(variant.price, plan.percentOff) : variant.price;
    return { product, variant, quantity, plan, unitPrice, lineTotal: unitPrice * quantity, lineCompare: variant.price * quantity };
  });
  const subtotal = lines.reduce((a, l) => a + l.lineTotal, 0);
  const free = rules.freeFrom > 0 && subtotal >= rules.freeFrom;
  const shipping = free ? 0 : rules.flatRate;
  return {
    lines,
    subtotal,
    shipping,
    total: subtotal + shipping,
    itemCount: lines.reduce((a, l) => a + l.quantity, 0),
    hasSubscription: lines.some((l) => l.plan),
    hasGiftCard: lines.some((l) => isGiftCard(l.product)),
    toFreeShipping: rules.freeFrom > 0 ? Math.max(0, rules.freeFrom - subtotal) : 0,
  };
}
