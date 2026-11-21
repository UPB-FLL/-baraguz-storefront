import { allow, send, type Req, type Res } from './_lib/http.js';
import { enabledCheckouts, shippingRules } from './_lib/env.js';

/** Which checkouts this deployment has keys for, and the shipping rule the bag shows. */
export default function handler(req: Req, res: Res) {
  if (!allow(req, res, 'GET')) return;
  send(res, 200, { checkouts: enabledCheckouts(), shipping: shippingRules() });
}
