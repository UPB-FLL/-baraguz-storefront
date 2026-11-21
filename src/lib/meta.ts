import { collectionByHandle, productByHandle } from './store';

export interface PageMeta { title: string; description: string; image?: string; noindex?: boolean }

const strip = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const clip = (s: string, n = 155) => (s.length <= n ? s : `${s.slice(0, n - 1).replace(/\s+\S*$/, '')}…`);

/** One place for every page's head: the prerender writes it, the app sets it on navigation. */
export function metaFor(path: string): PageMeta {
  const p = path.replace(/\/+$/, '') || '/';
  if (p === '/') return { title: 'Baraguz | Herbal tea rituals, matched to you', description: 'Herbal tea blends for detox, calm, energy, focus and more. Take the 60-second quiz to find your ritual. Free U.S. shipping over $60; subscribe and save up to 15%.' };
  const prod = /^\/products\/([^/]+)$/.exec(p);
  if (prod) {
    const x = productByHandle(prod[1]);
    if (x) return { title: `${x.title} | Baraguz`, description: clip(strip(x.descriptionHtml) || `${x.title} from Baraguz.`), image: x.images[0]?.src };
  }
  const col = /^\/collections\/([^/]+)$/.exec(p);
  if (col) {
    const c = collectionByHandle(col[1]);
    if (c) return { title: `${c.title} | Baraguz`, description: `Shop ${c.title.toLowerCase()} from Baraguz. Free U.S. shipping over $60; subscribe and save on the blends that offer it.` };
  }
  if (p === '/pages/quiz') return { title: 'Find your blend: the 60-second tea quiz | Baraguz', description: 'Five quick questions about your goals and routine, and two or three Baraguz blends that work well together, with the reason each one made your list.' };
  if (p === '/cart') return { title: 'Your bag | Baraguz', description: 'Your Baraguz bag.', noindex: true };
  if (p === '/thank-you') return { title: 'Thank you | Baraguz', description: 'Your Baraguz order was received.', noindex: true };
  return { title: 'Page not found | Baraguz', description: 'This page could not be found.', noindex: true };
}
