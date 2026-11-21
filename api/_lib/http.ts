import type { IncomingMessage, ServerResponse } from 'node:http';

/** The slice of Vercel's Node request and response the routes use. */
export type Req = IncomingMessage & { body?: unknown; query?: Record<string, string | string[]> };
export type Res = ServerResponse & { status?: (code: number) => Res; json?: (body: unknown) => void };

export function send(res: Res, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

export function allow(req: Req, res: Res, method: 'GET' | 'POST'): boolean {
  if (req.method === method) return true;
  res.setHeader('Allow', method);
  send(res, 405, { error: `Use ${method}.` });
  return false;
}

/** The raw request body (webhook signatures are computed over it). */
export async function rawBody(req: Req): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(typeof c === 'string' ? Buffer.from(c) : c);
  return Buffer.concat(chunks);
}

/** The JSON body, whether Vercel parsed it already or not. */
export async function jsonBody<T>(req: Req): Promise<T> {
  if (req.body && typeof req.body === 'object') return req.body as T;
  if (typeof req.body === 'string') return JSON.parse(req.body) as T;
  const raw = await rawBody(req);
  return (raw.length ? JSON.parse(raw.toString('utf8')) : {}) as T;
}

export function originOf(req: Req): string {
  const env = process.env.SITE_URL?.replace(/\/$/, '');
  if (env) return env;
  const host = req.headers['x-forwarded-host'] ?? req.headers.host ?? 'localhost:5173';
  const proto = req.headers['x-forwarded-proto'] ?? 'https';
  return `${proto}://${host}`;
}
