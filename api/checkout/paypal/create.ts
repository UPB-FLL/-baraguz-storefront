import { allow, jsonBody, send, type Req, type Res } from '../../_lib/http.js';
import { env, shippingRules } from '../../_lib/env.js';
import { catalog } from '../../_lib/catalog.js';
import { paypalCall } from '../../_lib/paypal.js';
import { CartError, priceCart, type CartLineInput } from '../../../shared/pricing.js';
import { PayPalUnsupported, paypalOrderBody } from '../../../shared/providers.js';

/** Creates a PayPal order for the priced cart; the PayPal button opens it. */
export default async function handler(req: Req, res: Res, fetchImpl: typeof fetch = fetch) {
  if (!allow(req, res, 'POST')) return;
  if (!env.paypalClientId() || !env.paypalSecret()) return send(res, 503, { error: 'PayPal is not switched on.' });
  try {
    const { lines } = await jsonBody<{ lines: CartLineInput[] }>(req);
    const cart = priceCart(catalog, lines, shippingRules());
    const { status, json } = await paypalCall<{ id?: string; message?: string }>('/v2/checkout/orders', paypalOrderBody(cart), fetchImpl);
    if (status >= 300 || !json.id) return send(res, 502, { error: json.message ?? `PayPal answered ${status}.` });
    send(res, 200, { id: json.id });
  } catch (err) {
    if (err instanceof CartError) return send(res, err.status, { error: err.message });
    if (err instanceof PayPalUnsupported) return send(res, 409, { error: err.message });
    send(res, 502, { error: 'Could not start PayPal.' });
  }
}
