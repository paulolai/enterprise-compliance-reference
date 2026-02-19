import { ShippingMethod } from '../../../../shared/src';
import { useCartStore } from '../../store/cartStore';
import { PriceDisplay } from '../ui/PriceDisplay';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

const SHIPPING_METHODS = [
  { method: ShippingMethod.STANDARD, label: 'Standard', description: '5-7 business days', defaultCost: 700 },
  { method: ShippingMethod.EXPEDITED, label: 'Expedited', description: '2-3 business days', defaultCost: 805 },
  { method: ShippingMethod.EXPRESS, label: 'Express', description: '1 business day', defaultCost: 2500 },
];

export function ShippingMethodSelector() {
  const { shippingMethod, setShippingMethod } = useCartStore();
  const pricingResult = useCartStore((state) => state.pricingResult);

  return (
    <RadioGroup
      value={shippingMethod}
      onValueChange={(value) => setShippingMethod(value as ShippingMethod)}
      className="space-y-3"
      data-testid="shipping-method-selector"
    >
      {SHIPPING_METHODS.map(({ method, label, description, defaultCost }) => {
        const isSelected = shippingMethod === method;

        // Use actual totalShipping from pricingResult, or defaultCost for unselected methods
        const cost = (pricingResult?.shipment.method === method)
          ? pricingResult.shipment.totalShipping
          : defaultCost;

        // Free shipping applies to Standard & Expedited when threshold met
        // Express is never free (fixed $25 rate)
        const isFree = pricingResult?.shipment.isFreeShipping && method !== ShippingMethod.EXPRESS;

        return (
          <Label
            key={method}
            htmlFor={`shipping-${method}`}
            className={`shipping-option flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-colors ${
              isSelected ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
            }`}
          >
            <div className="flex items-center gap-3">
              <RadioGroupItem
                value={method}
                id={`shipping-${method}`}
                aria-describedby={`shipping-${method}-desc`}
              />
              <div>
                <div className="font-medium">{label}</div>
                <div
                  id={`shipping-${method}-desc`}
                  className="text-sm text-muted-foreground"
                >
                  {description}
                </div>
              </div>
            </div>
            <div className="text-right">
              {isFree ? (
                <Badge variant="success" data-testid="free-shipping-badge">Free</Badge>
              ) : (
                <PriceDisplay amount={cost} />
              )}
            </div>
          </Label>
        );
      })}
    </RadioGroup>
  );
}
