import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { logger } from '../lib/logger';
import { formatCurrency, type PricingResult } from '../../../shared/src/types';
import { CartBadge } from '../components/cart/CartBadge';

interface OrderItem {
  sku: string;
  quantity: number;
  price: number;
  discount: number;
}

interface Order {
  id: string;
  status: string;
  total: number;
  items: OrderItem[];
  shippingAddress: Record<string, unknown>;
  pricingResult: PricingResult;
}

export function OrderConfirmationPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = React.useState<Order | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchOrder = async () => {
      try {
        const response = await fetch(`/api/orders/${orderId}`);
        if (!response.ok) {
          throw new Error('Order not found');
        }
        const data = await response.json();
        setOrder(data);
      } catch (err) {
        logger.error('Failed to fetch order', err, { orderId });
        setError('Failed to load order details.');
      } finally {
        setLoading(false);
      }
    };

    if (orderId) {
      fetchOrder();
    }
  }, [orderId]);

  if (loading) {
    return (
      <div className="page-loading">
        <header>
          <nav>
            <Link to="/">TechHome Direct</Link>
          </nav>
        </header>
        <main>
           <p>Loading order details...</p>
        </main>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="page-error">
        <header>
          <nav>
            <Link to="/">TechHome Direct</Link>
          </nav>
        </header>
        <main>
            <h1>Error</h1>
            <p>{error || 'Order not found'}</p>
            <Link to="/">Return Home</Link>
        </main>
      </div>
    );
  }

  return (
    <div className="order-confirmation-page" data-testid="order-confirmation-page">
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
          <h1>Order Confirmed!</h1>
          <p className="order-id">Order ID: {order.id}</p>
        </div>

        <div className="confirmation-content" style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div className="success-message" style={{ background: '#f0fdf4', padding: '1rem', borderRadius: '8px', marginBottom: '2rem', border: '1px solid #bbf7d0', color: '#166534' }}>
            <p>Thank you for your purchase. Your order has been received.</p>
          </div>

          <div className="order-summary-card" style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>Order Summary</h2>
            <div className="order-items">
              {order.items.map((item) => (
                <div key={item.sku} className="order-item" style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #eee' }}>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <span className="item-name" style={{ fontWeight: 500 }}>{item.sku}</span>
                    <span className="item-qty" style={{ color: '#666' }}>x{item.quantity}</span>
                  </div>
                  <span className="item-price">{formatCurrency(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>
            
            <div className="order-totals" style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '2px solid #eee' }}>
              <div className="total-row grand-total" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.25rem', fontWeight: 'bold' }}>
                <span>Total</span>
                <span data-testid="order-total">{formatCurrency(order.total)}</span>
              </div>
            </div>
          </div>

          <div className="actions" style={{ marginTop: '2rem', textAlign: 'center' }}>
            <Link to="/products" className="button primary-button" style={{ 
              display: 'inline-block', 
              background: '#2563eb', 
              color: 'white', 
              padding: '0.75rem 1.5rem', 
              borderRadius: '4px', 
              textDecoration: 'none',
              fontWeight: 500
            }}>
              Continue Shopping
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
