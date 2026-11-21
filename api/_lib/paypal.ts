import { env } from './env.js';

/** PayPal Orders v2 with client credentials. */
export async function paypalToken(fetchImpl: typeof fetch = fetch): Promise<string> {
  const auth = Buffer.from(`${env.paypalClientId()}:${env.paypalSecret()}`).toString('base64');
  const res = await fetchImpl(`${env.paypalBase()}/v1/oauth2/token`, {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
  });
  const json = (await res.json()) as { access_token?: string };
  if (!res.ok || !json.access_token) throw new Error(`PayPal sign-in failed (${res.status}).`);
  return json.access_token;
}

export async function paypalCall<T>(path: string, body: unknown | null, fetchImpl: typeof fetch = fetch, method: 'POST' | 'GET' = 'POST'): Promise<{ status: number; json: T }> {
  const token = await paypalToken(fetchImpl);
  const res = await fetchImpl(`${env.paypalBase()}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: body === null ? undefined : JSON.stringify(body),
  });
  return { status: res.status, json: (await res.json()) as T };
}
