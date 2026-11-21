import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { collectionByHandle, productsIn, priceOf } from '../lib/store';
import { ProductCard } from '../components/ProductCard';
import { NotFound } from './NotFound';

type Sort = 'featured' | 'price-asc' | 'price-desc';

export function CollectionPage() {
  const { handle = 'all' } = useParams();
  const collection = collectionByHandle(handle);
  const [sort, setSort] = useState<Sort>('featured');
  const [inStock, setInStock] = useState(false);
  const list = useMemo(() => {
    let ps = productsIn(collection);
    if (inStock) ps = ps.filter((p) => priceOf(p).available);
    if (sort !== 'featured') ps = [...ps].sort((a, b) => (priceOf(a).min - priceOf(b).min) * (sort === 'price-asc' ? 1 : -1));
    return ps;
  }, [collection, sort, inStock]);
  if (!collection) return <NotFound />;
  return (
    <div className="page-width">
      <div className="collection-hero"><p className="eyebrow">Shop</p><h1>{collection.title}</h1></div>
      <div className="toolbar">
        <label className="filters" style={{ alignItems: 'center', gap: 8, font: '700 14px var(--font-text)' }}>
          <input type="checkbox" checked={inStock} onChange={(e) => setInStock(e.target.checked)} /> In stock only
        </label>
        <label className="visually-hidden" htmlFor="Sort">Sort by</label>
        <select id="Sort" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
          <option value="featured">Featured</option><option value="price-asc">Price, low to high</option><option value="price-desc">Price, high to low</option>
        </select>
      </div>
      <p className="muted" style={{ margin: '0 0 14px' }}>{list.length} products</p>
      <div className="grid grid--4">{list.map((p, i) => <ProductCard key={p.handle} product={p} eager={i < 4} />)}</div>
      <div style={{ height: 72 }} />
    </div>
  );
}
