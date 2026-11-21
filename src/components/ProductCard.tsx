import { Link } from 'react-router-dom';
import { bestPercentOff, discounted, formatMoney, productUrl, type Product } from '../../shared/catalog';
import { priceOf, reviewsFor } from '../lib/store';
import { ratingSummary } from '../../shared/reviews';
import { Stars } from './Stars';

export function ProductCard({ product, eager = false }: { product: Product; eager?: boolean }) {
  const price = priceOf(product);
  const off = bestPercentOff(product);
  const rating = ratingSummary(reviewsFor(product.handle));
  const [a, b] = product.images;
  return (
    <div className="card">
      <div className="card__media">
        {a ? <img src={a.src} alt={a.alt} loading={eager ? 'eager' : 'lazy'} /> : null}
        {b ? <img src={b.src} alt="" loading="lazy" /> : null}
        <div className="card__badges">
          {!price.available ? <span className="badge badge--sold">Sold out</span>
            : price.compare && price.compare > price.min ? <span className="badge">Save {formatMoney(price.compare - price.min).replace('.00', '')}</span>
            : off ? <span className="badge">Subscribe &amp; save {off}%</span> : null}
        </div>
      </div>
      <div className="card__body">
        <h3 className="card__title"><Link to={productUrl(product.handle)}>{product.title}</Link></h3>
        {rating.count ? <Stars rating={rating.average} count={rating.count} /> : null}
        <div className="card__price price">
          {price.varies ? 'From ' : ''}<span>{formatMoney(price.min)}</span>
          {price.compare && price.compare > price.min ? <s>{formatMoney(price.compare)}</s> : null}
        </div>
        {off && price.available ? <span className="card__sub">{formatMoney(discounted(price.min, off))} with a subscription</span> : null}
      </div>
    </div>
  );
}
