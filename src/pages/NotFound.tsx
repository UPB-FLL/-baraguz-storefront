import { Link } from 'react-router-dom';

export function NotFound() {
  return (
    <div className="page-width not-found">
      <p className="eyebrow">404</p>
      <h1>This page has steeped too long</h1>
      <p className="lede" style={{ margin: '0 auto 24px' }}>It may have moved. Try the shop, or let the quiz find your blend.</p>
      <Link className="button" to="/collections/all">Shop all teas</Link>
    </div>
  );
}
