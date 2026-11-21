import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Logo } from './Logo';
import { CartIcon, CloseIcon, MenuIcon } from './Icons';
import { useCart } from '../lib/cart';

const NAV: [string, string][] = [['Shop', '/collections/all'], ['Take the quiz', '/pages/quiz'], ['Rituals', '/collections/bundles'], ['Best sellers', '/collections/best-sellers']];

export function Header() {
  const { priced, setOpen } = useCart();
  const [menu, setMenu] = useState(false);
  const count = priced?.itemCount ?? 0;
  return (
    <>
      <div className="announcement"><strong>Free U.S. shipping</strong> on orders over $60 · Subscribe &amp; save on your favourite blends</div>
      <header className="header">
        <div className="page-width header__inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button className="icon-button menu-toggle" type="button" aria-label="Open menu" onClick={() => setMenu(true)}><MenuIcon /></button>
            <Link to="/" aria-label="Baraguz home"><Logo /></Link>
          </div>
          <nav className="header__nav" aria-label="Main">
            {NAV.map(([t, u]) => <NavLink key={u} to={u}>{t}</NavLink>)}
          </nav>
          <div className="header__icons">
            <button className="icon-button" type="button" aria-label={`Bag, ${count} items`} onClick={() => setOpen(true)}>
              <CartIcon />{count ? <span className="cart-count">{count}</span> : null}
            </button>
          </div>
        </div>
      </header>
      <div className="mobile-menu" role="dialog" aria-modal="true" aria-label="Menu" {...(menu ? { 'open-menu': '' } : {})}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Logo />
          <button className="icon-button" type="button" aria-label="Close menu" onClick={() => setMenu(false)}><CloseIcon /></button>
        </div>
        <nav aria-label="Mobile">{NAV.map(([t, u]) => <Link key={u} to={u} onClick={() => setMenu(false)}>{t}</Link>)}</nav>
        <Link className="button button--full" to="/pages/quiz" onClick={() => setMenu(false)}>Find your blend</Link>
      </div>
    </>
  );
}
