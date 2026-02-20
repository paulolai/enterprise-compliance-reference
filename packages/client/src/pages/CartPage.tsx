import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCartStore } from '../store/cart-store';
import { CartItem as CartItemComponent } from '../components/cart/CartItem';
import { CartSummary } from '../components/cart/CartSummary';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingBag } from 'lucide-react';
import { logger } from '../lib/logger';

export function CartPage() {
  const items = useCartStore((state) => state.items);
  const pricingResult = useCartStore((state) => state.pricingResult);
  const user = useCartStore((state) => state.user);
  const navigate = useNavigate();

  // Fetch pricing when cart or user changes
  React.useEffect(() => {
    const controller = new AbortController();
    
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
          signal: controller.signal,
        });

        if (response.ok) {
          const result = await response.json();
          useCartStore.setState({ pricingResult: result });
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          return;
        }
        logger.error('Pricing fetch failed', error, { page: 'cart' });
      }
    };

    fetchPricing();

    return () => {
      controller.abort();
    };
  }, [items, user]);

  const handleCheckout = () => {
    navigate('/checkout');
  };

  return (
    <div className="space-y-8" data-testid="cart-page">
      <div className="flex items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Shopping Cart</h1>
        {user?.tenureYears && user.tenureYears > 2 && (
          <Badge variant="vip" data-testid="vip-user-label">
            VIP Member ({user.tenureYears} years)
          </Badge>
        )}
      </div>

      {items.length === 0 ? (
        <div className="text-center py-16 space-y-4">
          <ShoppingBag className="h-16 w-16 mx-auto text-muted-foreground" />
          <p className="text-xl font-medium">Your cart is empty</p>
          <p className="text-muted-foreground">Add some products to get started</p>
          <Button asChild>
            <Link to="/products">Continue Shopping</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[1fr_350px]">
          <div className="space-y-4">
            {items.map((item) => (
              <CartItemComponent key={item.sku} sku={item.sku} />
            ))}
          </div>

          <div className="space-y-4">
            <CartSummary result={pricingResult} />
            {pricingResult && (
              <Button
                size="lg"
                className="w-full"
                onClick={handleCheckout}
                data-testid="checkout-button"
              >
                Proceed to Checkout
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
