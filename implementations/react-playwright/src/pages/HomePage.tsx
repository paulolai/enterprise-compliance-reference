import { Link } from 'react-router-dom';
import { productCatalog } from '../store/cartStore';
import { CartBadge } from '../components/cart/CartBadge';

export function HomePage() {
  const categories = [...new Set(productCatalog.map((p) => p.category))];

  return (
    <div className="home-page" data-testid="home-page">
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
        <section className="hero">
          <h1>Welcome to TechHome Direct</h1>
          <p>Your one-stop shop for Electronics, Home Goods, and Clothing</p>
        </section>

        <section className="categories">
          <h2>Shop by Category</h2>
          {categories.map((category) => (
            <Link
              key={category}
              to={`/products?category=${category}`}
              className="category-card"
            >
              <h3>{category}</h3>
            </Link>
          ))}
        </section>

        <section className="featured">
          <h2>Featured Products</h2>
          <div className="product-grid">
            {productCatalog.slice(0, 4).map((product) => (
              <Link key={product.sku} to={`/products/${product.sku}`}>
                <div className="product-card-compact" data-testid={`product-card-${product.sku}`}>
                  <h3>{product.name}</h3>
                  <p>{categoryEmoji(product.category)}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>

      <footer>
        <p>&copy; 2025 TechHome Direct - Executable Specs Demo</p>
      </footer>
    </div>
  );
}

function categoryEmoji(category: string): string {
  switch (category) {
    case 'Electronics':
      return '📱';
    case 'Home':
      return '🏠';
    case 'Clothing':
      return '👕';
    default:
      return '📦';
  }
}
