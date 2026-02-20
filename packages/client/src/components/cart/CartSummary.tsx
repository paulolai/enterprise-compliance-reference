import { useCartStore } from '../../store/cart-store';
import { PriceDisplay } from '../ui/PriceDisplay';
import { DiscountBadge } from '../ui/DiscountBadge';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { PricingResult } from '../../../../shared/src';

interface CartSummaryProps {
  result?: PricingResult | null;
}

export function CartSummary({ result }: CartSummaryProps) {
  const user = useCartStore((state) => state.user);
  const storePricingResult = useCartStore((state) => state.pricingResult);
  const pricingResult = result || storePricingResult;

  if (!pricingResult) {
    return (
      <Card data-testid="cart-summary">
        <CardHeader>
          <CardTitle>Order Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="h-4 bg-muted animate-pulse rounded" />
            <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="cart-summary">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Order Summary
          {user?.tenureYears && user.tenureYears > 2 && (
            <Badge variant="vip">VIP</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Subtotal */}
        <div className="flex justify-between text-sm summary-row">
          <span className="text-muted-foreground">Subtotal</span>
          <span>
            <PriceDisplay amount={pricingResult.originalTotal} showZero />
          </span>
        </div>

        {/* Volume Discount */}
        {pricingResult.volumeDiscountTotal > 0 && (
          <div className="flex justify-between text-sm summary-row discount">
            <span className="text-muted-foreground">Volume Discount</span>
            <span className="text-success">
              <DiscountBadge amount={pricingResult.volumeDiscountTotal} variant="bulk" />
            </span>
          </div>
        )}

        {/* VIP Discount */}
        {pricingResult.vipDiscount > 0 && (
          <div className="flex justify-between text-sm summary-row discount">
            <span className="text-muted-foreground">VIP Discount</span>
            <span className="text-success">
              <DiscountBadge amount={pricingResult.vipDiscount} variant="vip" />
            </span>
          </div>
        )}

        {/* Total Discount */}
        {pricingResult.totalDiscount > 0 && (
          <div className="flex justify-between text-sm summary-row total-discount">
            <span className="text-muted-foreground">Total Discount</span>
            <span className="text-success font-medium">
              <DiscountBadge amount={pricingResult.totalDiscount} variant="total" />
            </span>
          </div>
        )}

        {/* Cap Warning */}
        {pricingResult.isCapped && (
          <div className="text-xs text-warning bg-warning/10 p-2 rounded summary-row cap-warning">
            Discount capped at 30%
          </div>
        )}

        {/* Product Total */}
        <div className="flex justify-between font-medium pt-2 border-t summary-row total">
          <span>Product Total</span>
          <span>
            <PriceDisplay amount={pricingResult.finalTotal} showZero />
          </span>
        </div>

        {/* Free Shipping Badge */}
        {pricingResult.shipment.isFreeShipping && (
          <div className="py-2 summary-row">
            <Badge variant="success" data-testid="free-shipping-badge">
              Free Shipping!
            </Badge>
          </div>
        )}

        {/* Shipping */}
        <div className="flex justify-between text-sm summary-row shipping">
          <span className="text-muted-foreground">
            Shipping ({pricingResult.shipment.method})
          </span>
          <span className="shipping-cost" data-testid="shipping-cost">
            <PriceDisplay amount={pricingResult.shipment.totalShipping} showZero testId="price-display-amount" />
          </span>
        </div>

        {/* Grand Total */}
        <div className="flex justify-between text-lg font-bold pt-3 border-t summary-row grand-total">
          <span>Grand Total</span>
          <span data-testid="grand-total">
            ${((pricingResult.grandTotal) / 100).toFixed(2)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
