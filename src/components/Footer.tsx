import { Link } from 'react-router-dom';
import { Logo } from './Logo';
import { SITE } from '../lib/store';

export function Footer() {
  return (
    <footer className="footer">
      <div className="page-width">
        <div className="footer__grid">
          <div>
            <Logo />
            <p style={{ color: 'rgba(255,255,255,.75)', marginTop: 18, maxWidth: '30em' }}>We aim to inspire positive change through exceptional tea, bringing people together and promoting a healthier, more mindful lifestyle.</p>
          </div>
          <div>
            <h2>Shop</h2>
            <ul>
              <li><Link to="/collections/best-sellers">Best sellers</Link></li>
              <li><Link to="/collections/detox-teas-calming-energy">SlimT</Link></li>
              <li><Link to="/collections/health-herbal-teas">The T blends</Link></li>
              <li><Link to="/collections/hair-skin-nails">EIA hair, skin &amp; nails</Link></li>
              <li><Link to="/collections/bundles">Bundles</Link></li>
            </ul>
          </div>
          <div>
            <h2>Help</h2>
            <ul>
              <li><Link to="/pages/quiz">Find your blend</Link></li>
              <li><a href={`https://${'baraguz.com'}/policies/shipping-policy`}>Shipping policy</a></li>
              <li><a href={`https://${'baraguz.com'}/policies/refund-policy`}>Refund policy</a></li>
              <li><a href={SITE.social.tiktok}>TikTok</a></li>
              <li><a href={SITE.social.instagram}>Instagram</a></li>
            </ul>
          </div>
          <div>
            <h2>Visit &amp; contact</h2>
            <ul>
              <li>{SITE.contact.address}</li>
              <li>{SITE.contact.hours}</li>
              <li><a href={`tel:${SITE.contact.phone.replace(/[^+\d]/g, '')}`}>{SITE.contact.phone}</a></li>
              <li><a href={`mailto:${SITE.contact.email}`}>{SITE.contact.email}</a></li>
            </ul>
          </div>
        </div>
        <p className="disclaimer">*{SITE.fda}</p>
        <div className="footer__bottom"><span>© {new Date().getFullYear()} Baraguz. All rights reserved.</span><span>Shop Pay · PayPal · Cards · Apple Pay · Google Pay</span></div>
      </div>
    </footer>
  );
}
