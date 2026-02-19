import { useCartStore } from '../../store/cartStore';
import { PriceDisplay } from '../ui/PriceDisplay';
import { DiscountBadge } from '../ui/DiscountBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Trash2 } from 'lucide-react';

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

  if (!item) {
    return <div className="cart-item-placeholder" data-testid={`cart-item-${sku}`} />;
  }

  return (
    <Card data-testid={`cart-item-${sku}`}>
      <CardContent className="p-4">
        <div className="flex gap-4">
          {/* Product Image */}
          <div className="w-24 h-24 rounded-md overflow-hidden bg-muted flex-shrink-0">
            <img
              src={getProductImage(sku)}
              alt={item.name}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Product Details */}
          <div className="flex-1 space-y-2">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold">{item.name}</h3>
                <p className="text-sm text-muted-foreground">SKU: {item.sku}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeItem(sku)}
                aria-label={`Remove ${item.name} from cart`}
                data-testid={`remove-cart-item-${sku}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            {/* Quantity Controls */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => updateQuantity(sku, item.quantity - 1)}
                disabled={item.quantity <= 1}
                aria-label="Decrease quantity"
              >
                -
              </Button>
              <Input
                type="number"
                value={item.quantity}
                onChange={handleQuantityChange}
                min="1"
                className="w-16 h-8 text-center"
                aria-label={`Quantity of ${item.name}`}
                data-testid={`cart-item-quantity-${sku}`}
              />
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => updateQuantity(sku, item.quantity + 1)}
                aria-label="Increase quantity"
              >
                +
              </Button>
            </div>

            {/* Pricing */}
            <div className="flex items-center gap-4 text-sm">
              <span className="text-muted-foreground">
                <PriceDisplay amount={item.price} label="Price" testId={`cart-item-price-${sku}`} />
              </span>
              {bulkDiscount > 0 && (
                <DiscountBadge amount={bulkDiscount} variant="bulk" sku={sku} />
              )}
              <span className="font-medium ml-auto">
                <PriceDisplay
                  amount={lineItemResult?.totalAfterBulk || 0}
                  label="Subtotal"
                  testId={`cart-item-subtotal-${sku}`}
                />
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function getProductImage(sku: string): string {
  const colors: Record<string, string> = {
    'WIRELESS-EARBUDS': '1e40af',
    'SMART-WATCH': '1d4ed8',
    'TABLET-10': '2563eb',
    'LAPTOP-PRO': '3b82f6',
    'DESK-LAMP': '15803d',
    'COFFEE-MAKER': '16a34a',
    'THROW-BLANKET': '22c55e',
    'BATH-TOWEL-SET': '4ade80',
    'T-SHIRT-BASIC': '7c3aed',
    'JEANS-SLIM': '8b5cf6',
    'HOODIE-ZIP': 'a855f7',
  };
  
  const color = colors[sku] || '6b7280';
  return `https://placehold.co/200x200/${color}/white?text=${encodeURIComponent(sku.replace(/-/g, '+'))}`;
}
