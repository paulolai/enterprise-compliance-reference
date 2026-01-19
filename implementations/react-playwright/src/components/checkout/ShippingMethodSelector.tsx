import { ShippingMethod } from '../../../../shared/src';
import { useCartStore } from '../../store/cartStore';
import { PriceDisplay } from '../ui/PriceDisplay';

const SHIPPING_METHODS: Array<{
  method: ShippingMethod;
  label: string;
  description: string;
  baseCost: number;
}> = [
  {
    method: ShippingMethod.STANDARD,
    label: 'Standard',
    description: '5-7 business days',
    baseCost: 700,
  },
  {
    method: ShippingMethod.EXPEDITED,
    label: 'Expedited',
    description: '2-3 business days',
    baseCost: 0,
  },
  {
    method: ShippingMethod.EXPRESS,
    label: 'Express',
    description: '1 business day',
    baseCost: 2500,
  },
];

export function ShippingMethodSelector() {
  const { shippingMethod, setShippingMethod } = useCartStore();
  const pricingResult = useCartStore((state) => state.pricingResult);

  return (
    <div className="shipping-method-selector" data-testid="shipping-method-selector">
      <h3>Shipping Method</h3>
      {SHIPPING_METHODS.map(({ method, label, description, baseCost }) => {
        const isSelected = shippingMethod === method;
        const cost = method === ShippingMethod.EXPRESS
          ? 2500
          : pricingResult?.shipment.isFreeShipping
          ? 0
          : baseCost;

        return (
          <div
            key={method}
            className={`shipping-option ${isSelected ? 'selected' : ''}`}
            onClick={() => setShippingMethod(method)}
          >
            <input
              type="radio"
              name="shipping"
              id={`shipping-${method}`}
              checked={isSelected}
              onChange={() => setShippingMethod(method)}
              data-testid={`shipping-${method.toLowerCase()}`}
            />
            <label htmlFor={`shipping-${method}`}>
              <span className="shipping-label">{label}</span>
              <span className="shipping-description">{description}</span>
              <span className="shipping-cost">
                {pricingResult?.shipment.isFreeShipping && method === ShippingMethod.STANDARD ? (
                  <span className="free-badge" data-testid="free-shipping-badge">
                    Free
                  </span>
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
