#!/usr/bin/env node
// Writes every route as its own HTML file (dist/<route>/index.html) from the SSR build,
// so each page's head and content are in the raw HTML; the browser then hydrates it.
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = path.resolve(new URL('.', import.meta.url).pathname, '..');
const dist = path.join(root, 'dist');
const template = readFileSync(path.join(dist, 'index.html'), 'utf8');
const { render, routes } = await import(pathToFileURL(path.join(root, 'dist-ssr/entry-server.js')).href);
const site = (process.env.SITE_URL || 'https://baraguz.com').replace(/\/$/, '');
// NOINDEX=1 on a staging or preview deployment: nothing is indexed, so it never competes with baraguz.com.
const staging = process.env.NOINDEX === '1';
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

function page(url, { html, meta }) {
  const canonical = `${site}${url === '/' ? '/' : url}`;
  const head = [
    `<link rel="canonical" href="${esc(canonical)}" />`,
    `<meta property="og:title" content="${esc(meta.title)}" />`,
    `<meta property="og:description" content="${esc(meta.description)}" />`,
    `<meta property="og:url" content="${esc(canonical)}" />`,
    `<meta property="og:type" content="${url.startsWith('/products/') ? 'product' : 'website'}" />`,
    meta.image ? `<meta property="og:image" content="${esc(meta.image)}" />` : '',
    `<meta name="twitter:card" content="summary_large_image" />`,
    meta.noindex || staging ? '<meta name="robots" content="noindex" />' : '',
  ].filter(Boolean).join('\n    ');
  return template
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(meta.title)}</title>`)
    .replace(/<meta name="description" content="[^"]*" \/>/, `<meta name="description" content="${esc(meta.description)}" />`)
    .replace('<!--app-head-->', head)
    .replace('<!--app-html-->', html);
}

// The shell for paths not prerendered (an unknown address renders the 404 in the browser).
writeFileSync(path.join(dist, '_shell.html'), template.replace('<!--app-head-->', '<meta name="robots" content="noindex" />').replace('<!--app-html-->', ''));
const urls = routes();
for (const url of urls) {
  const out = url === '/' ? path.join(dist, 'index.html') : path.join(dist, url, 'index.html');
  mkdirSync(path.dirname(out), { recursive: true });
  writeFileSync(out, page(url, render(url)));
}
const indexable = urls.filter((u) => !['/cart', '/thank-you'].includes(u));
writeFileSync(path.join(dist, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${indexable.map((u) => `  <url><loc>${site}${u}</loc></url>`).join('\n')}\n</urlset>\n`);
writeFileSync(path.join(dist, 'robots.txt'), staging ? 'User-agent: *\nDisallow: /\n' : `User-agent: *\nDisallow: /cart\nDisallow: /thank-you\nDisallow: /api/\nSitemap: ${site}/sitemap.xml\n`);
rmSync(path.join(root, 'dist-ssr'), { recursive: true, force: true });
console.log(`prerender: ${urls.length} pages, sitemap with ${indexable.length}${staging ? ' (NOINDEX: staging, nothing indexed)' : ''}`);
