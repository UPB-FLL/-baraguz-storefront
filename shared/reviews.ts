import type { Review } from './catalog.js';

/**
 * Reads Judge.me's review export (Judge.me → Settings → Import/Export → Export reviews, a CSV).
 * Keeps published reviews only; never keeps an email, an IP address or a full surname.
 */

/** RFC 4180 CSV: quoted fields, doubled quotes, commas and newlines inside quotes. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  const s = text.replace(/^﻿/, '');
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (quoted) {
      if (ch === '"' && s[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && s[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.some((c) => c !== '')) rows.push(row);
      row = [];
    } else field += ch;
  }
  row.push(field);
  if (row.some((c) => c !== '')) rows.push(row);
  return rows;
}

/** "Jordan Smith" → "Jordan S."; an email-looking name is never shown. */
export function displayName(name: string): string {
  const clean = name.trim();
  if (!clean || clean.includes('@')) return 'Verified customer';
  const [first, ...rest] = clean.split(/\s+/);
  const last = rest.at(-1);
  return last ? `${first} ${last[0].toUpperCase()}.` : first;
}

const truthy = (v: string | undefined) => /^(true|yes|1|verified)$/i.test((v ?? '').trim());

export function reviewsFromJudgeMe(csv: string): { reviews: Review[]; skipped: number } {
  const [header, ...rows] = parseCsv(csv);
  if (!header) return { reviews: [], skipped: 0 };
  const col = (name: string) => header.findIndex((h) => h.trim().toLowerCase() === name);
  const at = (r: string[], name: string) => { const i = col(name); return i >= 0 ? r[i] ?? '' : ''; };
  const reviews: Review[] = [];
  let skipped = 0;
  rows.forEach((r, n) => {
    const handle = at(r, 'product_handle').trim();
    const rating = Number(at(r, 'rating'));
    const curated = at(r, 'curated').trim().toLowerCase();
    const published = curated === '' || curated === 'ok' || curated === 'published';
    if (!handle || !(rating >= 1 && rating <= 5) || !published) { skipped++; return; }
    const photos = at(r, 'picture_urls').split(/[,\s]+/).filter((u) => /^https:\/\//.test(u));
    reviews.push({
      id: `jm-${n + 1}`,
      productHandle: handle,
      rating: Math.round(rating),
      title: at(r, 'title').trim(),
      body: at(r, 'body').trim(),
      author: displayName(at(r, 'reviewer_name')),
      date: at(r, 'review_date').trim().slice(0, 10),
      verified: truthy(at(r, 'verified')) || truthy(at(r, 'verified_buyer')) || /verified/i.test(at(r, 'source')),
      reply: at(r, 'reply').trim() || null,
      photos,
    });
  });
  reviews.sort((a, b) => b.date.localeCompare(a.date));
  return { reviews, skipped };
}

export function ratingSummary(reviews: Review[]): { average: number; count: number } {
  if (!reviews.length) return { average: 0, count: 0 };
  return { average: Math.round((reviews.reduce((a, r) => a + r.rating, 0) / reviews.length) * 10) / 10, count: reviews.length };
}
