import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCartStore } from '../store/cartStore';
import { CartBadge } from '../components/cart/CartBadge';
import { ShippingMethodSelector } from '../components/checkout/ShippingMethodSelector';
import { OrderSummary } from '../components/checkout/OrderSummary';

export function CheckoutPage() {
  const items = useCartStore((state) => state.items);
  const shippingMethod = useCartStore((state) => state.shippingMethod);
  const user = useCartStore((state) => state.user);
  const navigate = useNavigate();
  const [isPlacingOrder, setIsPlacingOrder] = React.useState(false);

  // Fetch pricing when shipping method changes
  React.useEffect(() => {
    const fetchPricing = async () => {
      if (items.length === 0) {
        navigate('/cart');
        return;
      }

      try {
        const response = await fetch('/api/pricing/calculate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items,
            user: user || { tenureYears: 0 },
            method: shippingMethod,
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
  }, [items, user, shippingMethod, navigate]);

  const handlePlaceOrder = async () => {
    setIsPlacingOrder(true);
    // Simulate order placement
    await new Promise((resolve) => setTimeout(resolve, 1000));
    useCartStore.getState().clear();
    navigate('/products?order=success');
    setIsPlacingOrder(false);
  };

  return (
    <div className="checkout-page" data-testid="checkout-page">
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
          <h1>Checkout</h1>
        </div>

        <div className="checkout-content">
          <div className="checkout-form">
            <section>
              <h2>Shipping Method</h2>
              <ShippingMethodSelector />
            </section>

            <section>
              <h2>Shipping Address</h2>
              <form>
                <input
                  type="text"
                  placeholder="Full Name"
                  data-testid="shipping-name"
                />
                <input
                  type="text"
                  placeholder="Street Address"
                  data-testid="shipping-address"
                />
                <input
                  type="text"
                  placeholder="City"
                  data-testid="shipping-city"
                />
                <div className="form-row">
                  <input type="text" placeholder="State" />
                  <input type="text" placeholder="ZIP Code" />
                </div>
              </form>
            </section>

            <section>
              <h2>Payment</h2>
              <form>
                <input
                  type="text"
                  placeholder="Card Number"
                  data-testid="card-number"
                />
                <div className="form-row">
                  <input type="text" placeholder="MM/YY" />
                  <input type="text" placeholder="CVC" />
                </div>
              </form>
            </section>
          </div>

          <div className="checkout-sidebar">
            <OrderSummary />
            <button
              className="place-order-button"
              onClick={handlePlaceOrder}
              disabled={isPlacingOrder || items.length === 0}
              data-testid="place-order-button"
            >
              {isPlacingOrder ? 'Placing Order...' : 'Place Order'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
