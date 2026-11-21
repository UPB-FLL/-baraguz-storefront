import { env } from './env.js';

/**
 * Records a Stripe or PayPal sale as a paid Shopify order (Admin REST API, write_orders scope),
 * so fulfilment, inventory and reporting stay in Shopify. Skipped without SHOPIFY_ADMIN_TOKEN.
 */
export async function recordShopifyOrder(body: unknown, fetchImpl: typeof fetch = fetch): Promise<{ recorded: boolean; id?: number; error?: string }> {
  const token = env.adminToken();
  const domain = env.adminDomain();
  if (!token || !domain) return { recorded: false, error: 'SHOPIFY_ADMIN_TOKEN or SHOPIFY_ADMIN_DOMAIN is not set.' };
  const res = await fetchImpl(`https://${domain}/admin/api/2025-01/orders.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as { order?: { id: number }; errors?: unknown };
  if (!res.ok || !json.order) return { recorded: false, error: `Shopify answered ${res.status}: ${JSON.stringify(json.errors ?? json).slice(0, 300)}` };
  return { recorded: true, id: json.order.id };
}
