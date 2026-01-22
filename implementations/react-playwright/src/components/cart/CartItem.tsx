import { useCartStore } from '../../store/cartStore';
import { PriceDisplay } from '../ui/PriceDisplay';
import { DiscountBadge } from '../ui/DiscountBadge';

interface CartItemProps {
  sku: string;
}

export function CartItem({ sku }: CartItemProps) {
  const item = useCartStore((state) => state.items.find((i) => i.sku === sku));
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const pricingResult = useCartStore((state) => state.pricingResult);

  const lineItemResult = pricingResult?.lineItems.find((li) => li.sku === sku);
  const bulkDiscount = lineItemResult?.bulkDiscount || 0;

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const quantity = parseInt(e.target.value, 10) || 0;
    updateQuantity(sku, quantity);
  };

  // Render empty placeholder if item doesn't exist (parent should guard, but handle gracefully)
  if (!item) {
    return <div className="cart-item-placeholder" data-testid={`cart-item-${sku}`} />;
  }

  return (
    <div className="cart-item" data-testid={`cart-item-${sku}`}>
      <div className="cart-item-details">
        <h3 className="cart-item-name">{item.name}</h3>
        <p className="cart-item-sku">SKU: {item.sku}</p>
      </div>

      <div className="cart-item-quantity">
        <button
          onClick={() => updateQuantity(sku, item.quantity - 1)}
          disabled={item.quantity <= 1}
        >
          -
        </button>
        <input
          type="number"
          value={item.quantity}
          onChange={handleQuantityChange}
          min="1"
          data-testid={`cart-item-quantity-${sku}`}
        />
        <button onClick={() => updateQuantity(sku, item.quantity + 1)}>+</button>
      </div>

      <div className="cart-item-pricing">
        <PriceDisplay amount={item.price} label="Price" />
        {bulkDiscount > 0 && <DiscountBadge amount={bulkDiscount} variant="bulk" sku={sku} />}
        <PriceDisplay
          amount={lineItemResult?.totalAfterBulk || 0}
          label="Subtotal"
        />
      </div>

      <button
        className="cart-item-remove"
        onClick={() => removeItem(sku)}
        data-testid={`remove-cart-item-${sku}`}
      >
        Remove
      </button>
    </div>
  );
}
