#!/usr/bin/env node
// Imports the Shopify catalog into src/data/catalog.json.
//   node scripts/import-catalog.mjs                 reads the live store (SHOPIFY_STORE_DOMAIN, default baraguz.com)
//   node scripts/import-catalog.mjs --from <dir>    reads saved copies: products_json_limit_250, pjs/<handle>.json,
//                                                   collections_json, cols/<handle>.json
// Uses only the store's public JSON (no token): products, variants, prices, images, and the subscription
// plans Seal Subscriptions keeps in Shopify. Prices are copied as Shopify states them, in cents.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const fromDir = args.includes('--from') ? args[args.indexOf('--from') + 1] : null;
const domain = process.env.SHOPIFY_STORE_DOMAIN || 'baraguz.com';
const out = path.resolve(new URL('.', import.meta.url).pathname, '../src/data/catalog.json');
const COLLECTIONS = (process.env.CATALOG_COLLECTIONS || 'best-sellers,detox-teas-calming-energy,health-herbal-teas,hair-skin-nails,bundles').split(',');

async function get(url, file) {
  if (fromDir) {
    const f = path.join(fromDir, file);
    if (!existsSync(f)) return null;
    return JSON.parse(readFileSync(f, 'utf8'));
  }
  const res = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': 'baraguz-storefront-import' } });
  if (!res.ok) throw new Error(`${url} answered ${res.status}`);
  return res.json();
}

const intervalCount = (name) => {
  const m = /(\d+)\s*month/i.exec(name);
  return m ? Number(m[1]) : 1;
};

function toProduct(list, js) {
  const plans = (js?.selling_plan_groups ?? []).flatMap((g) => g.selling_plans).map((p) => ({
    id: p.id,
    name: String(p.name).trim(),
    percentOff: (p.price_adjustments ?? []).find((a) => a.value_type === 'percentage')?.value ?? 0,
    interval: 'month',
    intervalCount: intervalCount(p.name),
  })).filter((p) => p.percentOff > 0);
  return {
    id: list.id,
    handle: list.handle,
    title: list.title,
    vendor: list.vendor,
    type: list.product_type || '',
    tags: list.tags ?? [],
    descriptionHtml: list.body_html || '',
    images: (list.images ?? []).map((i) => ({ src: i.src, alt: i.alt || list.title, width: i.width ?? null, height: i.height ?? null })),
    options: (list.options ?? []).map((o) => ({ name: o.name, values: o.values })),
    variants: list.variants.map((v) => ({
      id: v.id,
      title: v.title,
      options: [v.option1, v.option2, v.option3].filter((x) => x !== null && x !== undefined),
      price: Math.round(Number(v.price) * 100),
      compareAtPrice: v.compare_at_price ? Math.round(Number(v.compare_at_price) * 100) : null,
      available: Boolean(v.available),
      sku: v.sku || null,
    })),
    sellingPlans: plans,
    requiresSellingPlan: Boolean(js?.requires_selling_plan),
  };
}

const listing = await get(`https://${domain}/products.json?limit=250`, 'products_json_limit_250');
if (!listing?.products?.length) throw new Error('No products found.');
const products = [];
for (const p of listing.products) {
  const js = await get(`https://${domain}/products/${p.handle}.js`, `pjs/${p.handle}.json`);
  products.push(toProduct(p, js));
}
const collections = [{ handle: 'all', title: 'All products', productHandles: products.map((p) => p.handle) }];
const meta = await get(`https://${domain}/collections.json?limit=250`, 'collections_json');
for (const handle of COLLECTIONS) {
  const c = await get(`https://${domain}/collections/${handle}/products.json?limit=250`, `cols/${handle}.json`);
  if (!c) continue;
  const title = meta?.collections?.find((x) => x.handle === handle)?.title ?? handle;
  collections.push({ handle, title, productHandles: c.products.map((p) => p.handle).filter((h) => products.some((p) => p.handle === h)) });
}
mkdirSync(path.dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify({ importedAt: new Date().toISOString(), source: `https://${domain}`, currency: 'USD', products, collections }, null, 1));
console.log(`catalog: ${products.length} products, ${products.filter((p) => p.sellingPlans.length).length} with subscriptions, ${collections.length} collections → ${path.relative(process.cwd(), out)}`);
