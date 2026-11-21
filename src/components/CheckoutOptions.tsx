import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../lib/cart';
import { useConfig } from '../lib/config';

async function start(path: string, body: unknown): Promise<string> {
  const res = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.url) throw new Error(json.error || 'Checkout could not start.');
  return json.url as string;
}

declare global {
  interface Window { paypal?: { Buttons: (o: unknown) => { render: (el: HTMLElement) => Promise<void>; close?: () => void } } }
}

/** The three ways to pay, each shown only when this deployment has its keys. */
export function CheckoutOptions() {
  const { lines, priced, clear } = useCart();
  const config = useConfig();
  const navigate = useNavigate();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const paypalRef = useRef<HTMLDivElement>(null);
  const c = config.checkouts;
  const subscription = Boolean(priced?.hasSubscription);
  const shopifyOk = c.shopify && (!subscription || c.shopifySubscriptions);
  const giftCard = Boolean(priced?.hasGiftCard);
  const stripeOk = c.stripe && !giftCard;
  const paypalOk = c.paypal && !subscription && !giftCard && Boolean(c.paypalClientId);

  const go = async (name: string, path: string) => {
    setBusy(name); setError(null);
    try { window.location.href = await start(path, { lines }); }
    catch (e) { setError(e instanceof Error ? e.message : 'Checkout could not start.'); setBusy(null); }
  };

  useEffect(() => {
    if (!paypalOk || !paypalRef.current || !c.paypalClientId) return;
    const el = paypalRef.current;
    let buttons: { close?: () => void } | null = null;
    const render = () => {
      if (!window.paypal) return;
      el.innerHTML = '';
      const b = window.paypal.Buttons({
        style: { layout: 'horizontal', shape: 'pill', height: 46, tagline: false, label: 'paypal' },
        createOrder: async () => {
          const r = await fetch('/api/checkout/paypal/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lines }) });
          const j = await r.json();
          if (!r.ok) { setError(j.error); throw new Error(j.error); }
          return j.id;
        },
        onApprove: async (data: { orderID: string }) => {
          const r = await fetch('/api/checkout/paypal/capture', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId: data.orderID }) });
          const j = await r.json();
          if (!r.ok) { setError(j.error); return; }
          clear();
          navigate('/thank-you?via=paypal');
        },
        onError: () => setError('PayPal could not complete the payment.'),
      });
      buttons = b;
      b.render(el).catch(() => undefined);
    };
    const id = 'paypal-sdk';
    const existing = document.getElementById(id);
    if (existing) { render(); } else {
      const s = document.createElement('script');
      s.id = id;
      s.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(c.paypalClientId)}&currency=USD&intent=capture&components=buttons&disable-funding=card,credit,paylater`;
      s.onload = render;
      document.head.appendChild(s);
    }
    return () => { buttons?.close?.(); };
  }, [paypalOk, c.paypalClientId, lines, clear, navigate]);

  if (!priced) return null;
  return (
    <div className="checkout-options">
      {shopifyOk ? (
        <button className="button button--shop" type="button" disabled={!!busy} onClick={() => go('shopify', '/api/checkout/shopify')}>
          {busy === 'shopify' ? 'Opening…' : <>Checkout with <b style={{ marginLeft: 4 }}>shop</b>&nbsp;Pay or card</>}
        </button>
      ) : null}
      {stripeOk ? (
        <button className="button button--stripe" type="button" disabled={!!busy} onClick={() => go('stripe', '/api/checkout/stripe')}>
          {busy === 'stripe' ? 'Opening…' : 'Pay by card, Apple Pay or Google Pay'}
        </button>
      ) : null}
      {paypalOk ? <div className="paypal-slot" ref={paypalRef} aria-label="PayPal" /> : null}
      {giftCard && (c.stripe || c.paypal) ? <p className="checkout-note">Gift cards check out with Shop Pay or a card through Shopify, which issues the card.</p> : null}
      {subscription && c.paypal && !giftCard ? <p className="checkout-note">PayPal takes one-time purchases; subscriptions check out with Shop Pay or a card.</p> : null}
      {subscription && !shopifyOk && !stripeOk ? <p className="checkout-note">Subscriptions need the Shopify Storefront token or card checkout switched on.</p> : null}
      {error ? <p className="form-message" role="alert">{error}</p> : null}
    </div>
  );
}
