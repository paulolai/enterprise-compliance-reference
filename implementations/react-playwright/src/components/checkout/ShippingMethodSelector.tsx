import { ShippingMethod } from '../../../../shared/src';
import { useCartStore } from '../../store/cartStore';
import { PriceDisplay } from '../ui/PriceDisplay';

const SHIPPING_METHODS = [
  { method: ShippingMethod.STANDARD, label: 'Standard', description: '5-7 business days', defaultCost: 700 },
  { method: ShippingMethod.EXPEDITED, label: 'Expedited', description: '2-3 business days', defaultCost: 805 },
  { method: ShippingMethod.EXPRESS, label: 'Express', description: '1 business day', defaultCost: 2500 },
];

export function ShippingMethodSelector() {
  const { shippingMethod, setShippingMethod } = useCartStore();
  const pricingResult = useCartStore((state) => state.pricingResult);

  return (
    <div className="shipping-method-selector" data-testid="shipping-method-selector">
      <h3>Shipping Method</h3>
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
          <div key={method} className={`shipping-option ${isSelected ? 'selected' : ''}`} 
            onClick={() => setShippingMethod(method)}>
            <input type="radio" name="shipping" id={`shipping-${method}`} checked={isSelected}
              onChange={() => setShippingMethod(method)} />
            <label htmlFor={`shipping-${method}`}>
              <span className="shipping-label">{label}</span>
              <span className="shipping-description">{description}</span>
              <span className="shipping-cost">
                {isFree ? (
                  <span className="free-badge" data-testid="free-shipping-badge">Free</span>
                ) : (
                  <PriceDisplay amount={cost} />
                )}
              </span>
            </label>
          </div>
        );
      })}
    </div>
  );
}
