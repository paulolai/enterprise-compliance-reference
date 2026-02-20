import { useCartStore } from '../../store/cart-store';
import { CartSummary } from '../cart/CartSummary';
import type { PricingResult } from '../../../../shared/src';

interface OrderSummaryProps {
  result?: PricingResult | null;
}

export function OrderSummary({ result }: OrderSummaryProps) {
  const storePricingResult = useCartStore((state) => state.pricingResult);
  const pricingResult = result ?? storePricingResult;

  // Render placeholder if no pricing result available
  if (!pricingResult) {
    return (
      <div className="space-y-4" data-testid="order-summary">
        <div className="h-8 bg-muted animate-pulse rounded" />
        <div className="h-32 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  return (
    <div data-testid="order-summary">
      <CartSummary result={pricingResult} />
    </div>
  );
}
