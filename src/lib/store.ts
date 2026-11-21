import catalogData from '../data/catalog.json';
import reviewsData from '../data/reviews.json';
import type { Catalog, Collection, Product, Review } from '../../shared/catalog';

export const catalog = catalogData as unknown as Catalog;
export const reviews = reviewsData as unknown as Review[];

export const productByHandle = (h: string): Product | undefined => catalog.products.find((p) => p.handle === h);
export const collectionByHandle = (h: string): Collection | undefined => catalog.collections.find((c) => c.handle === h);
export const productsIn = (c: Collection | undefined): Product[] => (c ? c.productHandles.map(productByHandle).filter((p): p is Product => Boolean(p)) : []);
export const reviewsFor = (h: string): Review[] => reviews.filter((r) => r.productHandle === h);

/** Display price: the lowest available variant. */
export function priceOf(p: Product) {
  const vs = p.variants.filter((v) => v.available);
  const list = vs.length ? vs : p.variants;
  const min = Math.min(...list.map((v) => v.price));
  return { min, varies: new Set(list.map((v) => v.price)).size > 1, available: vs.length > 0, compare: list.find((v) => v.price === min)?.compareAtPrice ?? null };
}

export const SITE = {
  name: 'Baraguz',
  tagline: 'Herbal tea rituals',
  freeShippingFrom: 6000,
  fda: 'These statements have not been evaluated by the Food and Drug Administration. This product is not intended to diagnose, treat, cure, or prevent any disease.',
  contact: { address: '18117 Biscayne Blvd, Suite #107, Aventura, FL 33160', phone: '+1 (786) 899-1217', email: 'info@baraguz.com', hours: 'Open all week, 9am–9pm' },
  social: { tiktok: 'https://www.tiktok.com/@the_baraguz_family', instagram: 'https://www.instagram.com/baraguz_slimt/' },
};
