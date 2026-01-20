import { useParams, Link } from 'react-router-dom';
import { ProductDetail } from '../components/product/ProductDetail';
import { CartBadge } from '../components/cart/CartBadge';

export function ProductDetailPage() {
  const { sku } = useParams<{ sku: string }>();

  if (!sku) {
    return <div>Product not found</div>;
  }

  return (
    <div className="product-detail-page" data-testid="product-detail-page">
      <header>
        <nav>
          <Link to="/">TechHome Direct</Link>
          <div className="nav-links">
            <Link to="/products">Products</Link>
            <Link to="/cart">
              <CartBadge />
            </Link>
            <Link to="/login">Login</Link>
          </div>
        </nav>
      </header>

      <main>
        <Link to="/products" className="back-link">
          ← Back to Products
        </Link>
        <ProductDetail sku={sku} />
      </main>
    </div>
  );
}
