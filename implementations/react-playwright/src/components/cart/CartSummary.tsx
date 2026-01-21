import { useCartStore } from '../../store/cartStore';
import { PriceDisplay } from '../ui/PriceDisplay';
import { DiscountBadge } from '../ui/DiscountBadge';
import { VIPBadge } from '../ui/VIPBadge';
import type { PricingResult } from '../../../../shared/src';

interface CartSummaryProps {
  result?: PricingResult | null;
}

export function CartSummary({ result }: CartSummaryProps) {
  const user = useCartStore((state) => state.user);
  const storePricingResult = useCartStore((state) => state.pricingResult);
  const pricingResult = result || storePricingResult;

  // Render placeholder if no pricing result available
  if (!pricingResult) {
    return <div className="cart-summary-placeholder" data-testid="cart-summary" />;
  }

  return (
    <div className="cart-summary" data-testid="cart-summary">
      <VIPBadge isVisible={user?.tenureYears ? user.tenureYears > 2 : false} />

      <div className="summary-row">
        <span>Subtotal</span>
        <PriceDisplay amount={pricingResult.originalTotal} showZero />
      </div>

      {pricingResult.volumeDiscountTotal > 0 && (
        <div className="summary-row discount">
          <span>Volume Discount</span>
          <DiscountBadge amount={pricingResult.volumeDiscountTotal} variant="bulk" />
        </div>
      )}

      {pricingResult.vipDiscount > 0 && (
        <div className="summary-row discount">
          <span>VIP Discount</span>
          <DiscountBadge amount={pricingResult.vipDiscount} variant="vip" />
        </div>
      )}

      {pricingResult.totalDiscount > 0 && (
        <div className="summary-row total-discount">
          <span>Total Discount</span>
          <DiscountBadge amount={pricingResult.totalDiscount} variant="total" />
        </div>
      )}

      {pricingResult.isCapped && (
        <div className="summary-row cap-warning">
          <small>Discount capped at 30%</small>
        </div>
      )}

      <div className="summary-row total">
        <span>Product Total</span>
        <PriceDisplay amount={pricingResult.finalTotal} showZero />
      </div>

      {pricingResult.shipment.isFreeShipping && (
        <div className="summary-row free-shipping">
          <span className="badge" data-testid="free-shipping-badge">
            Free Shipping!
          </span>
        </div>
      )}

      <div className="summary-row shipping">
        <span>Shipping ({pricingResult.shipment.method})</span>
        <PriceDisplay amount={pricingResult.shipment.totalShipping} showZero />
      </div>

      <div className="summary-row grand-total">
        <span>Grand Total</span>
        <span className="grand-total" data-testid="grand-total">
          {`$${(pricingResult.grandTotal / 100).toFixed(2)}`}
        </span>
      </div>
    </div>
  );
}
