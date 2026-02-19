import { PriceDisplay } from '../ui/PriceDisplay';
import { productCatalog } from '../../store/cartStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { ShoppingCart } from 'lucide-react';

interface ProductCardProps {
  sku: string;
}

export function ProductCard({ sku }: ProductCardProps) {
  const product = productCatalog.find((p) => p.sku === sku);

  if (!product) return null;

  const handleAddToCart = () => {
    window.dispatchEvent(
      new CustomEvent('addToCart', {
        detail: {
          sku: product.sku,
          name: product.name,
          price: product.price,
          quantity: 1,
          weightInKg: product.weightInKg,
        },
      })
    );
  };

  return (
    <Card className="overflow-hidden h-full" data-testid={`product-card-${sku}`}>
      <div className="aspect-square overflow-hidden bg-muted">
        <img
          src={getProductImage(sku)}
          alt={product.name}
          className="w-full h-full object-cover transition-transform hover:scale-105"
        />
      </div>
      <CardContent className="p-4 space-y-2">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">
          {product.category}
        </p>
        <h3 className="font-semibold line-clamp-1">{product.name}</h3>
        <p className="text-sm text-muted-foreground line-clamp-2">
          {product.description}
        </p>
        <PriceDisplay amount={product.price} />
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <Button
          className="w-full"
          onClick={handleAddToCart}
          data-testid="add-to-cart"
        >
          <ShoppingCart className="mr-2 h-4 w-4" />
          Add to Cart
        </Button>
      </CardFooter>
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
  return `https://placehold.co/400x400/${color}/white?text=${encodeURIComponent(sku.replace(/-/g, '+'))}`;
}
