import { PriceDisplay } from '../ui/PriceDisplay';
import { productCatalog, useCartStore } from '../../store/cart-store';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ShoppingCart, Package } from 'lucide-react';

interface ProductDetailProps {
  sku: string;
}

export function ProductDetail({ sku }: ProductDetailProps) {
  const product = productCatalog.find((p) => p.sku === sku);
  const addItem = useCartStore((state) => state.addItem);

  if (!product) {
    return (
      <div className="text-center py-12">
        <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold">Product not found</h1>
      </div>
    );
  }

  const handleAddToCart = () => {
    addItem({
      sku: product.sku,
      name: product.name,
      price: product.price,
      quantity: 1,
      weightInKg: product.weightInKg,
    });
    toast.success(`Added ${product.name} to cart!`);
  };

  return (
    <div className="grid md:grid-cols-2 gap-8" data-testid="product-detail">
      {/* Product Image */}
      <div className="aspect-square rounded-lg overflow-hidden bg-muted">
        <img
          src={getProductImage(sku)}
          alt={product.name}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Product Info */}
      <div className="space-y-6">
        <div>
          <Badge variant="secondary" className="mb-2">
            {product.category}
          </Badge>
          <h1 className="text-3xl font-bold tracking-tight">{product.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">SKU: {product.sku}</p>
        </div>

        <div className="text-3xl font-bold">
          <PriceDisplay amount={product.price} />
        </div>

        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">{product.description}</p>
            
            <div className="mt-4 pt-4 border-t">
              <h3 className="font-medium mb-2">Specifications</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-muted-foreground">Weight:</span>
                <span>{product.weightInKg} kg</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Button size="lg" className="w-full" onClick={handleAddToCart} data-testid="add-to-cart">
          <ShoppingCart className="mr-2 h-5 w-5" />
          Add to Cart
        </Button>
      </div>
    </div>
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
  return `https://placehold.co/600x600/${color}/white?text=${encodeURIComponent(sku.replace(/-/g, '+'))}`;
}
