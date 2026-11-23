import { useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { CartProvider } from './lib/cart';
import { metaFor } from './lib/meta';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { CartDrawer } from './components/CartDrawer';
import { Home } from './pages/Home';
import { CollectionPage } from './pages/CollectionPage';
import { ProductPage } from './pages/ProductPage';
import { QuizPage } from './pages/QuizPage';
import { CartPage } from './pages/CartPage';
import { ThankYou } from './pages/ThankYou';
import { NotFound } from './pages/NotFound';

function RouteEffects() {
  const { pathname } = useLocation();
  useEffect(() => {
    const m = metaFor(pathname);
    document.title = m.title;
    document.querySelector('meta[name="description"]')?.setAttribute('content', m.description);
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export function App() {
  return (
    <CartProvider>
      <RouteEffects />
      <a className="skip-link" href="#main">Skip to content</a>
      <Header />
      <main id="main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/collections/:handle" element={<CollectionPage />} />
          <Route path="/products/:handle" element={<ProductPage />} />
          <Route path="/pages/quiz" element={<QuizPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/thank-you" element={<ThankYou />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
      <CartDrawer />
      <SpeedInsights />
    </CartProvider>
  );
}
