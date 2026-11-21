import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useCart } from '../lib/cart';

export function ThankYou() {
  const [params] = useSearchParams();
  const { clear } = useCart();
  useEffect(() => { if (params.get('via')) clear(); }, [params, clear]);
  return (
    <div className="thank-you">
      <p className="eyebrow">Order received</p>
      <h1>Thank you. Your ritual is on its way.</h1>
      <p className="lede" style={{ margin: '0 auto 24px' }}>A confirmation is on its way to your email, and tracking follows when your order ships.</p>
      <Link className="button" to="/collections/all">Keep shopping</Link>
    </div>
  );
}
