import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import { App } from './App';
import { metaFor } from './lib/meta';
import { catalog } from './lib/store';

export function render(url: string) {
  const html = renderToString(<StrictMode><StaticRouter location={url} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><App /></StaticRouter></StrictMode>);
  return { html, meta: metaFor(url) };
}

/** Every path the build writes as its own HTML file. */
export function routes(): string[] {
  return [
    '/',
    ...catalog.collections.map((c) => `/collections/${c.handle}`),
    ...catalog.products.map((p) => `/products/${p.handle}`),
    '/pages/quiz',
    '/cart',
    '/thank-you',
  ];
}
