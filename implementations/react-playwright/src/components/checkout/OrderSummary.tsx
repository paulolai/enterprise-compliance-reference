import { useCartStore } from '../../store/cartStore';
import { CartSummary } from '../cart/CartSummary';
import type { PricingResult } from '../../../../shared/src';

interface OrderSummaryProps {
  result?: PricingResult | null;
}

export function OrderSummary({ result }: OrderSummaryProps) {
  // Always call hook unconditionally
  const storePricingResult = useCartStore((state) => state.pricingResult);
  // Use prop result if provided, otherwise fall back to store
  const pricingResult = result ?? storePricingResult;

  // Render placeholder if no pricing result available
  if (!pricingResult) {
    return <div className="order-summary-placeholder" data-testid="order-summary" />;
  }

  return (
    <div className="order-summary" data-testid="order-summary">
      <h3>Order Summary</h3>
      <CartSummary result={pricingResult} />

      <div className="place-order-section">
        <button
          className="place-order-button"
          data-testid="place-order-button"
        >
          Place Order
        </button>
      </div>
    </div>
  );
}
