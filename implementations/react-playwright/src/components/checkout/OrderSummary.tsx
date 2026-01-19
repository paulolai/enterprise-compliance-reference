import { useCartStore } from '../../store/cartStore';
import { CartSummary } from '../cart/CartSummary';
import { PricingResult } from '../../../../shared/src';

interface OrderSummaryProps {
  result?: PricingResult | null;
}

export function OrderSummary({ result }: OrderSummaryProps) {
  const pricingResult = result || useCartStore((state) => state.pricingResult);

  if (!pricingResult) return null;

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
