export function Stars({ rating, count }: { rating: number; count?: number }) {
  if (!rating) return null;
  const full = Math.round(rating);
  return (
    <span className="rating-line" aria-label={`${rating} out of 5${count ? `, ${count} reviews` : ''}`}>
      <span className="stars" aria-hidden="true">{'★'.repeat(full)}{'☆'.repeat(5 - full)}</span>
      {count ? <span>{rating} · {count} reviews</span> : null}
    </span>
  );
}
