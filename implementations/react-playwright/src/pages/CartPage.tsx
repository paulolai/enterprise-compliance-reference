import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCartStore } from '../store/cartStore';
import { CartBadge } from '../components/cart/CartBadge';
import { CartItem as CartItemComponent } from '../components/cart/CartItem';
import { CartSummary } from '../components/cart/CartSummary';

export function CartPage() {
  const items = useCartStore((state) => state.items);
  const pricingResult = useCartStore((state) => state.pricingResult);
  const user = useCartStore((state) => state.user);
  const navigate = useNavigate();

  // Fetch pricing when cart or user changes
  React.useEffect(() => {
    const fetchPricing = async () => {
      if (items.length === 0) {
        useCartStore.setState({ pricingResult: null });
        return;
      }

      try {
        const response = await fetch('/api/pricing/calculate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items,
            user: user || { tenureYears: 0 },
            method: useCartStore.getState().shippingMethod,
          }),
        });

        if (response.ok) {
          const result = await response.json();
          useCartStore.setState({ pricingResult: result });
        }
      } catch (error) {
        console.error('Failed to fetch pricing:', error);
      }
    };

    fetchPricing();
  }, [items, user]);

  const handleCheckout = () => {
    navigate('/checkout');
  };

  return (
    <div className="cart-page" data-testid="cart-page">
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
          <h1>Shopping Cart</h1>
          {user?.tenureYears && user.tenureYears > 2 && (
            <span className="vip-badge" data-testid="vip-badge">
              VIP Member ({user.tenureYears} years)
            </span>
          )}
        </div>

        {items.length === 0 ? (
          <div className="empty-cart">
            <p>Your cart is empty</p>
            <Link to="/products">Continue Shopping</Link>
          </div>
        ) : (
          <div className="cart-content">
            <div className="cart-items">
              {items.map((item) => (
                <CartItemComponent key={item.sku} sku={item.sku} />
              ))}
            </div>

            <div className="cart-sidebar">
              <CartSummary result={pricingResult} />
              {pricingResult && (
                <button
                  className="checkout-button"
                  onClick={handleCheckout}
                  data-testid="checkout-button"
                >
                  Proceed to Checkout
                </button>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
