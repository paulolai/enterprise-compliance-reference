import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { productCatalog } from '../store/cartStore';
import { CartBadge } from '../components/cart/CartBadge';

export function ProductsPage() {
  const [searchParams] = useSearchParams();
  const categoryFilter = searchParams.get('category') || 'All';

  const filteredProducts =
    categoryFilter === 'All'
      ? productCatalog
      : productCatalog.filter((p) => p.category === categoryFilter);

  const categories = ['All', ...new Set(productCatalog.map((p) => p.category))];

  // Listen for add to cart events
  React.useEffect(() => {
    const handleAddToCart = (e: CustomEvent) => {
      window.alert(`Added ${e.detail.name} to cart!`);
    };

    window.addEventListener('addToCart', handleAddToCart as EventListener);

    return () => {
      window.removeEventListener('addToCart', handleAddToCart as EventListener);
    };
  }, []);

  return (
    <div className="products-page" data-testid="products-page">
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
        <div className="page-header">
          <h1>Products</h1>
        </div>

        <div className="category-filter">
          {categories.map((cat) => (
            <Link
              key={cat}
              to={`/products?category=${cat}`}
              className={`category-tab ${categoryFilter === cat ? 'active' : ''}`}
              data-testid={`category-${cat.toLowerCase()}`}
            >
              {cat}
            </Link>
          ))}
        </div>

        <div className="product-grid">
          {filteredProducts.map((product) => (
            <Link key={product.sku} to={`/products/${product.sku}`} className="product-link">
              <div className="product-card" data-testid={`product-card-${product.sku}`}>
                <span className="product-category">{product.category}</span>
                <h3>{product.name}</h3>
                <p>${(product.price / 100).toFixed(2)}</p>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
