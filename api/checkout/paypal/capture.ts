import { allow, jsonBody, send, type Req, type Res } from '../../_lib/http.js';
import { env, shippingRules } from '../../_lib/env.js';
import { catalog } from '../../_lib/catalog.js';
import { paypalCall } from '../../_lib/paypal.js';
import { recordShopifyOrder } from '../../_lib/shopifyAdmin.js';
import { CartError, priceCart } from '../../../shared/pricing.js';
import { cartFromPaypalItems, shopifyOrderBody } from '../../../shared/providers.js';

type Address = { address_line_1?: string; address_line_2?: string; admin_area_2?: string; admin_area_1?: string; postal_code?: string; country_code?: string };
interface Order {
  id: string;
  status: string;
  payer?: { email_address?: string; name?: { given_name?: string; surname?: string } };
  purchase_units?: {
    items?: { sku?: string; quantity?: string }[];
    shipping?: { name?: { full_name?: string }; address?: Address };
    payments?: { captures?: { amount?: { value?: string } }[] };
  }[];
}

/**
 * Reads the approved PayPal order, checks its cart can still be sold, captures it, and records it in Shopify.
 * The cart comes from PayPal's own copy of the order (item sku = variant id), never from the browser.
 */
export default async function handler(req: Req, res: Res, fetchImpl: typeof fetch = fetch) {
  if (!allow(req, res, 'POST')) return;
  if (!env.paypalClientId() || !env.paypalSecret()) return send(res, 503, { error: 'PayPal is not switched on.' });
  try {
    const { orderId } = await jsonBody<{ orderId: string }>(req);
    if (!/^[A-Z0-9-]{6,40}$/i.test(orderId ?? '')) return send(res, 400, { error: 'No PayPal order.' });
    const order = await paypalCall<Order>(`/v2/checkout/orders/${orderId}`, null, fetchImpl, 'GET');
    if (order.status >= 300) return send(res, 502, { error: `PayPal answered ${order.status}.` });
    const lines = cartFromPaypalItems(order.json.purchase_units?.[0]?.items);
    priceCart(catalog, lines, shippingRules()); // sold out since the button opened: refuse before charging

    const { status, json } = await paypalCall<Order>(`/v2/checkout/orders/${orderId}/capture`, null, fetchImpl);
    if (status >= 300 || json.status !== 'COMPLETED') return send(res, 502, { error: `PayPal did not complete the payment (${json.status ?? status}).` });
    const unit = json.purchase_units?.[0];
    const cart = priceCart(catalog, lines, shippingRules(), { ignoreStock: true });
    const paid = Math.round(Number(unit?.payments?.captures?.[0]?.amount?.value ?? NaN) * 100);
    const a = unit?.shipping?.address;
    const payerName = [json.payer?.name?.given_name, json.payer?.name?.surname].filter(Boolean).join(' ');
    const recorded = await recordShopifyOrder(
      shopifyOrderBody(cart, 'paypal', json.id, {
        email: json.payer?.email_address ?? null,
        name: unit?.shipping?.name?.full_name ?? (payerName || null),
        phone: null,
        address: a ? { line1: a.address_line_1 ?? null, line2: a.address_line_2 ?? null, city: a.admin_area_2 ?? null, state: a.admin_area_1 ?? null, postal_code: a.postal_code ?? null, country: a.country_code ?? null } : null,
      }, Number.isFinite(paid) ? paid : cart.total),
      fetchImpl,
    );
    if (!recorded.recorded) console.error('PayPal sale not recorded in Shopify', json.id, recorded.error);
    send(res, 200, { status: 'COMPLETED', id: json.id, recordedInShopify: recorded.recorded });
  } catch (err) {
    if (err instanceof CartError) return send(res, 409, { error: err.message });
    send(res, 502, { error: 'Could not complete the PayPal payment.' });
  }
}
