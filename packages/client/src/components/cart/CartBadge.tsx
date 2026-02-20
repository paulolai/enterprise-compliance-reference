import { useCartStore } from '../../store/cart-store';

export function CartBadge() {
  const items = useCartStore((state) => state.items);
  const count = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <span className="cart-badge" data-testid="cart-badge">
      {count}
    </span>
  );
}
