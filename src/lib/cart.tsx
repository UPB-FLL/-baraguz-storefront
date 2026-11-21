import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { CartError, priceCart, type CartLineInput, type PricedCart } from '../../shared/pricing';
import { catalog } from './store';
import { useConfig } from './config';

const KEY = 'baraguz_cart_v1';

interface CartApi {
  lines: CartLineInput[];
  priced: PricedCart | null;
  error: string | null;
  open: boolean;
  setOpen: (o: boolean) => void;
  add: (line: CartLineInput) => void;
  setQuantity: (index: number, quantity: number) => void;
  remove: (index: number) => void;
  clear: () => void;
}

const Ctx = createContext<CartApi | null>(null);

function read(): CartLineInput[] {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const config = useConfig();
  const [lines, setLines] = useState<CartLineInput[]>([]);
  const [open, setOpen] = useState(false);
  useEffect(() => { setLines(read()); }, []);
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(lines)); } catch { /* private mode */ } }, [lines]);

  const add = useCallback((line: CartLineInput) => {
    setLines((ls) => {
      const i = ls.findIndex((l) => l.variantId === line.variantId && (l.sellingPlanId ?? null) === (line.sellingPlanId ?? null));
      if (i < 0) return [...ls, line];
      return ls.map((l, n) => (n === i ? { ...l, quantity: Math.min(20, l.quantity + line.quantity) } : l));
    });
    setOpen(true);
  }, []);
  const setQuantity = useCallback((index: number, quantity: number) => setLines((ls) => (quantity < 1 ? ls.filter((_, n) => n !== index) : ls.map((l, n) => (n === index ? { ...l, quantity: Math.min(20, quantity) } : l)))), []);
  const remove = useCallback((index: number) => setLines((ls) => ls.filter((_, n) => n !== index)), []);
  const clear = useCallback(() => setLines([]), []);

  const { priced, error } = useMemo(() => {
    if (!lines.length) return { priced: null, error: null };
    try { return { priced: priceCart(catalog, lines, config.shipping), error: null }; }
    catch (e) { return { priced: null, error: e instanceof CartError ? e.message : 'The bag could not be priced.' }; }
  }, [lines, config.shipping]);

  const api = useMemo(() => ({ lines, priced, error, open, setOpen, add, setQuantity, remove, clear }), [lines, priced, error, open, add, setQuantity, remove, clear]);
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useCart(): CartApi {
  const c = useContext(Ctx);
  if (!c) throw new Error('useCart outside CartProvider');
  return c;
}
