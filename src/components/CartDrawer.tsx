import { Link } from 'react-router-dom';
import { formatMoney, productUrl } from '../../shared/catalog';
import { useCart } from '../lib/cart';
import { CloseIcon } from './Icons';
import { CheckoutOptions } from './CheckoutOptions';

export function ShipBar() {
  const { priced } = useCart();
  if (!priced) return null;
  const pct = Math.min(100, Math.round((priced.subtotal / (priced.subtotal + priced.toFreeShipping || 1)) * 100));
  return (
    <div className="ship-bar" role="status">
      {priced.toFreeShipping > 0 ? <>You’re {formatMoney(priced.toFreeShipping)} away from free U.S. shipping</> : <>You’ve unlocked free U.S. shipping 🌿</>}
      <div className="ship-bar__track"><div className="ship-bar__fill" style={{ width: `${priced.toFreeShipping > 0 ? pct : 100}%` }} /></div>
    </div>
  );
}

export function LineItems() {
  const { priced, setQuantity, remove, setOpen } = useCart();
  if (!priced) return null;
  return (
    <>
      {priced.lines.map((l, i) => (
        <div className="line-item" key={`${l.variant.id}-${l.plan?.id ?? 0}`}>
          <Link className="line-item__img" to={productUrl(l.product.handle)} onClick={() => setOpen(false)} tabIndex={-1}>
            {l.product.images[0] ? <img src={l.product.images[0].src} alt={l.product.title} loading="lazy" /> : null}
          </Link>
          <div>
            <Link className="line-item__title" to={productUrl(l.product.handle)} onClick={() => setOpen(false)}>{l.product.title}</Link>
            <div className="line-item__meta">
              {l.variant.title !== 'Default Title' ? <>{l.variant.title}<br /></> : null}
              {l.plan ? <span className="line-item__plan">↻ {l.plan.name} · save {l.plan.percentOff}%</span> : null}
            </div>
            <div className="qty">
              <button type="button" aria-label={`Decrease ${l.product.title}`} onClick={() => setQuantity(i, l.quantity - 1)}>−</button>
              <span aria-live="polite">{l.quantity}</span>
              <button type="button" aria-label={`Increase ${l.product.title}`} onClick={() => setQuantity(i, l.quantity + 1)}>+</button>
            </div>
            <button className="line-item__remove" type="button" onClick={() => remove(i)}>Remove</button>
          </div>
          <div className="line-item__price">
            {formatMoney(l.lineTotal)}
            {l.lineCompare > l.lineTotal ? <><br /><s className="muted" style={{ fontWeight: 500, fontSize: 13 }}>{formatMoney(l.lineCompare)}</s></> : null}
          </div>
        </div>
      ))}
    </>
  );
}

export function CartDrawer() {
  const { priced, error, open, setOpen } = useCart();
  return (
    <div className="drawer" aria-hidden={!open} {...(open ? { 'open-drawer': '' } : {})}>
      <div className="drawer__overlay" onClick={() => setOpen(false)} />
      <div className="drawer__panel" role="dialog" aria-modal="true" aria-label="Your bag">
        <div className="drawer__head">
          <h2>Your bag</h2>
          <button className="icon-button" type="button" aria-label="Close bag" onClick={() => setOpen(false)}><CloseIcon /></button>
        </div>
        {!priced ? (
          <div className="drawer__body"><div className="cart-empty">
            <h3>Your bag is empty</h3>
            {error ? <p className="form-message" role="alert">{error}</p> : <p className="muted">Not sure where to start? Five questions find your blend.</p>}
            <Link className="button" to="/pages/quiz" onClick={() => setOpen(false)}>Take the quiz</Link>
          </div></div>
        ) : (
          <>
            <div className="drawer__body"><ShipBar /><LineItems /></div>
            <div className="drawer__foot">
              <div className="totals"><span>Subtotal</span><span>{formatMoney(priced.subtotal)}</span></div>
              <p className="totals-note">Shipping and taxes at checkout.</p>
              <CheckoutOptions />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
