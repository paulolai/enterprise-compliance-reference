import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCartStore } from '../store/cart-store';
import { ShippingMethodSelector } from '../components/checkout/ShippingMethodSelector';
import { OrderSummary } from '../components/checkout/OrderSummary';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { logger } from '../lib/logger';

export function CheckoutPage() {
  const items = useCartStore((state) => state.items);
  const shippingMethod = useCartStore((state) => state.shippingMethod);
  const user = useCartStore((state) => state.user);
  const navigate = useNavigate();
  const [isPlacingOrder, setIsPlacingOrder] = React.useState(false);

  // Fetch pricing when shipping method changes
  React.useEffect(() => {
    const controller = new AbortController();
    
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
        logger.error('Pricing fetch failed', error, { page: 'checkout' });
      }
    };

    fetchPricing();

    return () => {
      controller.abort();
    };
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
    <div className="space-y-8" data-testid="checkout-page">
      <div className="flex items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Checkout</h1>
        {user?.tenureYears && user.tenureYears > 2 && (
          <Badge variant="vip" data-testid="vip-user-label">
            VIP Member ({user.tenureYears} years)
          </Badge>
        )}
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_350px]">
        <div className="space-y-6">
          {/* Shipping Method */}
          <Card>
            <CardHeader>
              <CardTitle>Shipping Method</CardTitle>
            </CardHeader>
            <CardContent>
              <ShippingMethodSelector />
            </CardContent>
          </Card>

          {/* Shipping Address */}
          <Card>
            <CardHeader>
              <CardTitle>Shipping Address</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="shipping-name">Full Name</Label>
                <Input
                  type="text"
                  id="shipping-name"
                  placeholder="Full Name"
                  data-testid="shipping-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shipping-address">Street Address</Label>
                <Input
                  type="text"
                  id="shipping-address"
                  placeholder="Street Address"
                  data-testid="shipping-address"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shipping-city">City</Label>
                <Input
                  type="text"
                  id="shipping-city"
                  placeholder="City"
                  data-testid="shipping-city"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="shipping-state">State</Label>
                  <Input type="text" id="shipping-state" placeholder="State" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shipping-zip">ZIP Code</Label>
                  <Input type="text" id="shipping-zip" placeholder="ZIP Code" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment */}
          <Card>
            <CardHeader>
              <CardTitle>Payment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="card-number">Card Number</Label>
                <Input
                  type="text"
                  id="card-number"
                  placeholder="Card Number"
                  data-testid="card-number"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="card-expiry">Expiry Date (MM/YY)</Label>
                  <Input type="text" id="card-expiry" placeholder="MM/YY" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="card-cvc">CVC</Label>
                  <Input type="text" id="card-cvc" placeholder="CVC" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <OrderSummary />
          <Button
            size="lg"
            className="w-full"
            onClick={handlePlaceOrder}
            disabled={isPlacingOrder || items.length === 0}
            data-testid="place-order-button"
          >
            {isPlacingOrder ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Placing Order...
              </>
            ) : (
              'Place Order'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
