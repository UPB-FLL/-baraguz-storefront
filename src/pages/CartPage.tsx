import { Link } from 'react-router-dom';
import { formatMoney } from '../../shared/catalog';
import { useCart } from '../lib/cart';
import { LineItems, ShipBar } from '../components/CartDrawer';
import { CheckoutOptions } from '../components/CheckoutOptions';

export function CartPage() {
  const { priced, error } = useCart();
  return (
    <div className="page-width">
      <h1 style={{ marginTop: 36 }}>Your bag</h1>
      {!priced ? (
        <div className="cart-empty">
          {error ? <p className="form-message" role="alert">{error}</p> : <p className="lede" style={{ margin: '0 auto 18px' }}>Your bag is empty.</p>}
          <Link className="button" to="/collections/all">Shop all teas</Link>
        </div>
      ) : (
        <div className="cart-page">
          <div><ShipBar /><LineItems /></div>
          <div className="cart-page__summary">
            <div className="totals"><span>Subtotal</span><span>{formatMoney(priced.subtotal)}</span></div>
            <p className="totals-note">Shipping and taxes at checkout.</p>
            <CheckoutOptions />
          </div>
        </div>
      )}
    </div>
  );
}
