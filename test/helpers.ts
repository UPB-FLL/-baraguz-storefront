import { Readable } from 'node:stream';
import type { Req, Res } from '../api/_lib/http';

/** A Node request carrying a JSON (or raw) body, as Vercel hands the routes one. */
export function req(method: string, body?: unknown, headers: Record<string, string> = {}): Req {
  const raw = body === undefined ? '' : typeof body === 'string' ? body : JSON.stringify(body);
  const r = Readable.from(raw ? [Buffer.from(raw)] : []) as unknown as Req;
  Object.assign(r, { method, headers: { host: 'shop.example.test', 'x-forwarded-proto': 'https', ...headers } });
  return r;
}

export interface Captured { status: number; body: any; headers: Record<string, string> }
export function res(): Res & { captured: Captured } {
  const captured: Captured = { status: 0, body: undefined, headers: {} };
  const r = {
    captured,
    statusCode: 0,
    setHeader(k: string, v: string) { captured.headers[k.toLowerCase()] = v; },
    end(s?: string) { captured.status = (r as any).statusCode; captured.body = s ? JSON.parse(s) : undefined; },
  };
  return r as unknown as Res & { captured: Captured };
}

/** A fetch that answers from a list of [matcher, response] pairs and records every call. */
export function fakeFetch(routes: [RegExp, (init: RequestInit | undefined) => { status?: number; json: unknown }][]) {
  const calls: { url: string; init?: RequestInit }[] = [];
  const f = (async (url: string | URL, init?: RequestInit) => {
    const u = String(url);
    calls.push({ url: u, init });
    const hit = routes.find(([m]) => m.test(u));
    if (!hit) throw new Error(`unexpected fetch ${u}`);
    const { status = 200, json } = hit[1](init);
    return new Response(JSON.stringify(json), { status, headers: { 'Content-Type': 'application/json' } });
  }) as typeof fetch;
  return { f, calls };
}
