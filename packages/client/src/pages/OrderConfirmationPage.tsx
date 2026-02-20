import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { logger } from '../lib/logger';
import { formatCurrency, type PricingResult } from '@executable-specs/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle, Package, AlertCircle } from 'lucide-react';

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
      <div className="space-y-6" data-testid="order-confirmation-page">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="space-y-6 text-center py-12" data-testid="order-confirmation-page">
        <AlertCircle className="h-16 w-16 mx-auto text-destructive" />
        <h1 className="text-2xl font-bold">Error</h1>
        <p className="text-muted-foreground">{error || 'Order not found'}</p>
        <Button asChild>
          <Link to="/">Return Home</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8" data-testid="order-confirmation-page">
      <div className="text-center space-y-2">
        <CheckCircle className="h-16 w-16 mx-auto text-success" />
        <h1 className="text-3xl font-bold">Order Confirmed!</h1>
        <p className="text-muted-foreground">Order ID: {order.id}</p>
      </div>

      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Order Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-success/10 text-success p-4 rounded-lg">
            <p>Thank you for your purchase. Your order has been received.</p>
          </div>

          <div className="space-y-3">
            {order.items.map((item) => (
              <div key={item.sku} className="flex items-center justify-between py-2 border-b">
                <div className="flex items-center gap-4">
                  <span className="font-medium">{item.sku}</span>
                  <span className="text-sm text-muted-foreground">x{item.quantity}</span>
                </div>
                <span className="font-medium">{formatCurrency(item.price * item.quantity)}</span>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t-2">
            <div className="flex items-center justify-between text-xl font-bold">
              <span>Total</span>
              <span data-testid="order-total">{formatCurrency(order.total)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="text-center">
        <Button asChild size="lg">
          <Link to="/products">Continue Shopping</Link>
        </Button>
      </div>
    </div>
  );
}
