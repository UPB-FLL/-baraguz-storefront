import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { bestPercentOff, discounted, formatMoney } from '../../shared/catalog';
import { productByHandle, reviewsFor, SITE } from '../lib/store';
import { ratingSummary } from '../../shared/reviews';
import { useCart } from '../lib/cart';
import { Stars } from '../components/Stars';
import { CartIcon, LeafIcon, RepeatIcon, TruckIcon } from '../components/Icons';
import { NotFound } from './NotFound';

const NOT_INGREDIENTS = ['herbalteas', 'shopbycategory', 'detox', '28day', 'collagen', 'flask', 'matcha', 'baraguz', 'supplements'];

export function ProductPage() {
  const { handle = '' } = useParams();
  const product = productByHandle(handle);
  const { add } = useCart();
  const [image, setImage] = useState(0);
  const [variantId, setVariantId] = useState(() => (product?.variants.find((v) => v.available) ?? product?.variants[0])?.id ?? 0);
  const [mode, setMode] = useState<'once' | 'subscribe'>(product?.requiresSellingPlan ? 'subscribe' : 'once');
  const [planId, setPlanId] = useState(product?.sellingPlans[0]?.id ?? 0);
  const [qty, setQty] = useState(1);
  const reviews = useMemo(() => reviewsFor(handle), [handle]);
  if (!product) return <NotFound />;
  const variant = product.variants.find((v) => v.id === variantId) ?? product.variants[0];
  const plan = mode === 'subscribe' ? product.sellingPlans.find((s) => s.id === planId) ?? null : null;
  const price = plan ? discounted(variant.price, plan.percentOff) : variant.price;
  const best = bestPercentOff(product);
  const rating = ratingSummary(reviews);
  const ingredients = product.tags.filter((t) => { const x = t.toLowerCase(); return !NOT_INGREDIENTS.includes(x) && !x.includes(' tea') && !x.includes('bags'); });
  return (
    <div className="page-width">
      <div className="product">
        <div className="product__media">
          <div className="product__main-image">{product.images[image] ? <img src={product.images[image].src} alt={product.images[image].alt} /> : null}</div>
          {product.images.length > 1 ? (
            <div className="product__thumbs">
              {product.images.slice(0, 10).map((im, i) => (
                <button type="button" key={im.src} aria-current={i === image} aria-label={`Show image ${i + 1}`} onClick={() => setImage(i)}><img src={im.src} alt="" loading="lazy" /></button>
              ))}
            </div>
          ) : null}
        </div>
        <div className="product__info">
          <p className="eyebrow">{product.vendor}</p>
          <h1 className="product__title">{product.title}</h1>
          <div className="product__rating">{rating.count ? <Stars rating={rating.average} count={rating.count} /> : null}</div>
          <div className="product__price price">
            {formatMoney(price)}
            {variant.compareAtPrice && variant.compareAtPrice > price ? <s>{formatMoney(variant.compareAtPrice)}</s> : plan ? <s>{formatMoney(variant.price)}</s> : null}
          </div>
          <p className="product__tax">Shipping calculated at checkout; free in the U.S. over $60.</p>

          {product.options.length && !(product.variants.length === 1 && variant.title === 'Default Title') ? (
            <fieldset className="variant-picker">
              <legend>{product.options[0].name}</legend>
              <div className="pills">
                {product.variants.map((v) => (
                  <span key={v.id}>
                    <input type="radio" id={`v-${v.id}`} name="variant" checked={v.id === variantId} disabled={!v.available} onChange={() => setVariantId(v.id)} />
                    <label htmlFor={`v-${v.id}`}>{v.title}</label>
                  </span>
                ))}
              </div>
            </fieldset>
          ) : null}

          {product.sellingPlans.length ? (
            <fieldset className="purchase-options">
              <legend>Purchase options</legend>
              {!product.requiresSellingPlan ? (
                <label className="option-card">
                  <input type="radio" name="purchase" checked={mode === 'once'} onChange={() => setMode('once')} />
                  <span className="option-card__title">One-time purchase</span>
                  <span className="option-card__price">{formatMoney(variant.price)}</span>
                </label>
              ) : null}
              <label className="option-card">
                <input type="radio" name="purchase" checked={mode === 'subscribe'} onChange={() => setMode('subscribe')} />
                <span className="option-card__title">Subscribe &amp; save <span className="badge">Up to {best}% off</span><span className="option-card__note">Delivered on your schedule.</span></span>
                <span className="option-card__price">{formatMoney(discounted(variant.price, (product.sellingPlans.find((s) => s.id === planId) ?? product.sellingPlans[0]).percentOff))} <s>{formatMoney(variant.price)}</s></span>
                <span className="frequency">
                  <label className="visually-hidden" htmlFor="Frequency">Delivery frequency</label>
                  <select id="Frequency" value={planId} onChange={(e) => setPlanId(Number(e.target.value))}>
                    {product.sellingPlans.map((s) => <option key={s.id} value={s.id}>{s.name} · save {s.percentOff}%</option>)}
                  </select>
                </span>
              </label>
            </fieldset>
          ) : null}

          <div className="buy-row">
            <div className="qty">
              <button type="button" aria-label="Decrease quantity" onClick={() => setQty((q) => Math.max(1, q - 1))}>−</button>
              <span aria-live="polite">{qty}</span>
              <button type="button" aria-label="Increase quantity" onClick={() => setQty((q) => Math.min(20, q + 1))}>+</button>
            </div>
            <button className="button button--full" type="button" disabled={!variant.available} onClick={() => add({ variantId: variant.id, quantity: qty, sellingPlanId: plan?.id ?? null })}>
              <CartIcon />{variant.available ? (plan ? 'Subscribe' : 'Add to bag') : 'Sold out'}
            </button>
          </div>

          <ul className="assurances">
            <li><TruckIcon />Free U.S. shipping over $60</li>
            <li><RepeatIcon />Subscribe &amp; save on your schedule</li>
            <li><LeafIcon />Ingredients listed on every blend</li>
          </ul>
          <div className="accordion">
            <details open><summary>About this blend</summary><div className="rte" dangerouslySetInnerHTML={{ __html: product.descriptionHtml }} /></details>
            {ingredients.length ? <details><summary>Ingredients</summary><div className="ingredient-chips">{ingredients.map((t) => <span key={t}>{t}</span>)}</div></details> : null}
            <details><summary>Shipping &amp; returns</summary><div className="rte"><p>Orders ship to all 50 states with tracking by email. Free U.S. shipping over $60. See the <a href="https://baraguz.com/policies/refund-policy">refund policy</a>.</p></div></details>
          </div>
          <p className="fda">*{SITE.fda}</p>
        </div>
      </div>

      {reviews.length ? (
        <section className="section" style={{ paddingTop: 0 }}>
          <div className="section-head"><div><p className="eyebrow">Reviews</p><h2>What customers say</h2><Stars rating={rating.average} count={rating.count} /></div></div>
          <div className="reviews">
            {reviews.slice(0, 12).map((r) => (
              <article className="review" key={r.id}>
                <Stars rating={r.rating} />
                {r.title ? <h4>{r.title}</h4> : null}
                <p>{r.body}</p>
                <small>{r.author}{r.verified ? ' · Verified buyer' : ''}{r.date ? ` · ${r.date}` : ''}</small>
                {r.reply ? <div className="review-reply"><b>Baraguz:</b> {r.reply}</div> : null}
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
