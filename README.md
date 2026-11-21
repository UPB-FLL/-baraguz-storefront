# Baraguz storefront (Vite + React)

A custom storefront for Baraguz, built from the brand package. It keeps the catalog, subscriptions and
fulfilment in the existing Shopify store and offers three ways to pay. Each checkout appears only when its
keys are set, so the site can launch with Shopify alone and add Stripe or PayPal later.

| Checkout | What the shopper gets | Where the order lands | Needs |
|---|---|---|---|
| **Shopify** (always on) | Shop Pay, cards, PayPal, Apple/Google Pay as the store has them; Subscribe & save through Seal Subscriptions | Shopify, as today | Nothing for one-time bags (cart link). `SHOPIFY_STOREFRONT_TOKEN` for subscriptions |
| **Stripe Checkout** | Cards, Apple Pay, Google Pay, Link; subscriptions billed by Stripe | Shopify, as a paid order, via the webhook | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, plus the Shopify admin pair |
| **PayPal** | PayPal buttons, one-time bags only | Shopify, as a paid order, at capture | `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, plus the Shopify admin pair |

Every price is recomputed on the server from `src/data/catalog.json` (`shared/pricing.ts`); the browser only
names a variant, a quantity and a plan. Gift cards always go through Shopify, the only checkout that can issue them.

## Setup

```bash
npm ci
npm run import:catalog          # reads https://baraguz.com's public product JSON → src/data/catalog.json
npm run import:reviews -- judgeme-reviews.csv   # optional: Judge.me → Settings → Import/Export → Export reviews
npm test
npm run build                   # typecheck, client build, SSR build, prerender of every page
```

Deploy on Vercel (framework Vite; `vercel.json` sets the rest). Copy `.env.example` into the project's
environment variables. Set `NOINDEX=1` on any deployment that is not baraguz.com itself: every page is then
`noindex` and `robots.txt` disallows everything, so a staging URL never competes with the live store in search. Run `import:catalog` again whenever products, prices or subscription plans change in
Shopify, then redeploy: the storefront sells only what the imported catalog lists.

### Shopify
- **Storefront token** (for subscriptions through Shopify): Shopify admin → Settings → Apps and sales
  channels → Develop apps (or the Headless channel) → Storefront API access with
  `unauthenticated_write_checkouts` and `unauthenticated_read_selling_plans`.
- **Admin token** (to record Stripe and PayPal sales): a custom app with `write_orders` (and `read_products`).
  `SHOPIFY_ADMIN_DOMAIN` is the `*.myshopify.com` domain.

### Stripe
Add a webhook endpoint `https://<site>/api/webhooks/stripe` for `checkout.session.completed` and put its signing
secret in `STRIPE_WEBHOOK_SECRET`. A sale Shopify refuses to record answers 500, so Stripe retries and shows it.

### PayPal
Create a REST app at developer.paypal.com. `PAYPAL_ENV=sandbox` until tested, then `live` with live keys.

### Shipping
Shopify's checkout uses the store's own rates. Stripe and PayPal use `FREE_SHIPPING_FROM_CENTS` (6000, the
store's $60 free-shipping line) and `FLAT_SHIPPING_CENTS`, which is **0 until set to the store's actual U.S.
rate**: check Shopify → Settings → Shipping and set it before switching Stripe or PayPal on.

## Limits to know
- **Stripe subscriptions renew in Stripe.** The first order is recorded in Shopify; renewals are not. Fulfil
  renewals from Stripe, or keep subscriptions on Shopify's checkout (Seal) and use Stripe for one-time bags.
- **PayPal takes one-time bags.** Subscriptions check out with Shopify or Stripe.
- **Taxes** are not computed for Stripe or PayPal orders. Turn on Stripe Tax if Baraguz collects sales tax.
- **Reviews** come from a Judge.me export at build time: published only, first name and last initial, no email
  or IP. Re-export and rebuild to refresh them.
- **Account pages, search and the blog** stay on Shopify for now.

## Layout
`src/` the app (pages, components, `lib/` cart, store, quiz, page heads) · `shared/` pricing, checkout request
bodies, review import (used by the browser, the API and the tests) · `api/` Vercel functions · `scripts/`
imports and prerender · `test/` Vitest (fixtures are fictional).
