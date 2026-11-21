#!/usr/bin/env node
// Imports Judge.me's review export into src/data/reviews.json.
//   node scripts/import-reviews.mjs path/to/judgeme-reviews.csv
// Judge.me → Settings → Import/Export → Export reviews. Published reviews only; emails and IPs are dropped.
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createServer } from 'vite';

const file = process.argv[2];
if (!file) { console.error('Usage: node scripts/import-reviews.mjs <judgeme-export.csv>'); process.exit(1); }
const root = path.resolve(new URL('.', import.meta.url).pathname, '..');
const vite = await createServer({ root, server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
try {
  const { reviewsFromJudgeMe } = await vite.ssrLoadModule('/shared/reviews.ts');
  const { reviews, skipped } = reviewsFromJudgeMe(readFileSync(file, 'utf8'));
  writeFileSync(path.join(root, 'src/data/reviews.json'), JSON.stringify(reviews, null, 1));
  const products = new Set(reviews.map((r) => r.productHandle)).size;
  console.log(`reviews: ${reviews.length} kept across ${products} products, ${skipped} skipped (unpublished or incomplete)`);
} finally {
  await vite.close();
}
