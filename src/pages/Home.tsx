import { Link } from 'react-router-dom';
import { productByHandle, productsIn, collectionByHandle } from '../lib/store';
import { ProductCard } from '../components/ProductCard';

const RITUALS = [
  { label: 'SlimT', title: 'Morning & night', text: 'Day Booster and Night Cleanse, made to work together.', to: '/collections/detox-teas-calming-energy', product: 'baraguz-slimt-night-cleanse' },
  { label: 'The T blends', title: 'A blend for every moment', text: 'Focus, calm, cycle and menopause support, immunity.', to: '/collections/health-herbal-teas', product: 'baraguz-braint-brain-health-tea' },
  { label: 'EIA', title: 'Hair, skin & nails', text: 'Organic elixirs, collagen and bamboo tools.', to: '/collections/hair-skin-nails', product: 'eia-organic-scalp-treatment-elixir-oil-hair-growth' },
  { label: 'Bundles', title: 'Routines by concern', text: 'Everything for one routine, priced together.', to: '/collections/bundles', product: 'baraguz-gut-health-plus-bundle' },
];

export function Home() {
  const hero = productByHandle('baraguz-slimt-day-booster-28-day-detox');
  const best = productsIn(collectionByHandle('best-sellers')).slice(0, 8);
  return (
    <>
      <section className="hero">
        <div className="page-width hero__grid">
          <div>
            <p className="eyebrow">Herbal tea rituals</p>
            <h1>Herbal tea rituals, matched to you.</h1>
            <p className="lede">Answer five quick questions about your goals and routine. Get two or three blends that work well together, with the reason each one made your list.</p>
            <div className="hero__actions">
              <Link className="button" to="/pages/quiz">Take the quiz</Link>
              <Link className="button button--secondary" to="/collections/all">Shop all teas</Link>
            </div>
            <ul className="hero__facts"><li>Free U.S. shipping over $60</li><li>Subscribe &amp; save up to 15%</li><li>Shop Pay, PayPal and cards</li></ul>
          </div>
          <div className="hero__media">
            {hero?.images[0] ? <img src={hero.images[0].src} alt={hero.title} /> : null}
            <div className="hero__card">About 60 seconds<span>No sign-up. 2 to 3 matched picks.</span></div>
          </div>
        </div>
      </section>
      <div className="ticker" aria-label="Herbal tea rituals, free U.S. shipping over $60, subscribe and save up to 15%">
        <div className="ticker__track" aria-hidden="true">
          {[0, 1].map((k) => ['Herbal tea rituals', 'Free U.S. shipping over $60', 'Subscribe & save up to 15%', 'Ingredients you can name', 'Shop Pay · PayPal · Cards'].map((t) => <span key={`${k}${t}`}>{t}</span>))}
        </div>
      </div>
      <section className="section section--white">
        <div className="page-width">
          <div className="section-head"><div><p className="eyebrow">Most loved</p><h2>Best sellers</h2></div><Link className="link-arrow" to="/collections/best-sellers">Shop all best sellers</Link></div>
          <div className="grid grid--4">{best.map((p, i) => <ProductCard key={p.handle} product={p} eager={i < 4} />)}</div>
        </div>
      </section>
      <section className="section">
        <div className="page-width">
          <div className="section-head"><div><p className="eyebrow">Rituals</p><h2>Shop by ritual</h2><p className="lede" style={{ margin: 0 }}>Blends that work well together, for the routine you want.</p></div></div>
          <div className="tiles">
            {RITUALS.map((r) => {
              const img = productByHandle(r.product)?.images[0];
              return (
                <Link className="tile" to={r.to} key={r.to}>
                  <div className="tile__media">{img ? <img src={img.src} alt="" loading="lazy" /> : null}<span className="badge">{r.label}</span></div>
                  <div className="tile__body"><h3>{r.title}</h3><p>{r.text}</p></div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
      <section className="section section--steep">
        <div className="page-width">
          <div className="section-head"><div><p className="eyebrow">How it works</p><h2>Three steps to your ritual</h2></div><Link className="button button--light" to="/pages/quiz">Start the quiz</Link></div>
          <div className="steps">
            <div className="step"><h3>Tell us your goals</h3><p className="muted" style={{ margin: 0 }}>Pick what matters most right now, from detox and bloating to calm, energy and menopause.</p></div>
            <div className="step"><h3>Share your routine</h3><p className="muted" style={{ margin: 0 }}>A few quick questions about timing, caffeine and life stage keep your picks right for you.</p></div>
            <div className="step"><h3>Get your matched ritual</h3><p className="muted" style={{ margin: 0 }}>See 2 to 3 blends that work well together, with the reason each one made your list.</p></div>
          </div>
        </div>
      </section>
      <section className="section section--lime">
        <div className="page-width" style={{ maxWidth: 860, textAlign: 'center' }}>
          <p className="eyebrow">Subscribe &amp; save</p>
          <h2>Your ritual, delivered</h2>
          <p className="lede" style={{ marginInline: 'auto' }}>Save 15% on monthly deliveries, 8% every two months or 5% every three, on the blends that offer it.</p>
          <Link className="button" style={{ marginTop: 18 }} to="/collections/health-herbal-teas">Shop subscription blends</Link>
        </div>
      </section>
    </>
  );
}
