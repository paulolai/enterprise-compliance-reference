import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { productCatalog } from '../store/cart-store';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';

export function ProductsPage() {
  const [searchParams] = useSearchParams();
  const categoryFilter = searchParams.get('category') || 'All';

  const filteredProducts =
    categoryFilter === 'All'
      ? productCatalog
      : productCatalog.filter((p) => p.category === categoryFilter);

  const categories = ['All', ...new Set(productCatalog.map((p) => p.category))];

  React.useEffect(() => {
    const handleAddToCart = (e: CustomEvent) => {
      toast.success(`Added ${e.detail.name} to cart!`);
    };

    window.addEventListener('addToCart', handleAddToCart as EventListener);

    return () => {
      window.removeEventListener('addToCart', handleAddToCart as EventListener);
    };
  }, []);

  return (
    <div className="space-y-8" data-testid="products-page">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Products</h1>
        <p className="text-muted-foreground mt-1">Browse our collection of quality products</p>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <Link
            key={cat}
            to={`/products?category=${cat}`}
            className={cn(
              'px-4 py-2 rounded-full text-sm font-medium transition-colors',
              categoryFilter === cat
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            )}
            data-testid={`category-${cat.toLowerCase()}`}
          >
            {cat}
          </Link>
        ))}
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredProducts.map((product) => (
          <Link key={product.sku} to={`/products/${product.sku}`}>
            <Card className="group overflow-hidden transition-all hover:shadow-lg h-full" data-testid={`product-card-${product.sku}`}>
              <div className="aspect-square overflow-hidden bg-muted">
                <img
                  src={getProductImage(product.sku)}
                  alt={product.name}
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                />
              </div>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">{product.category}</p>
                <h3 className="font-semibold mt-1 group-hover:text-primary transition-colors">{product.name}</h3>
                <p className="text-lg font-bold mt-2">${(product.price / 100).toFixed(2)}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
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
  return `https://placehold.co/400x400/${color}/white?text=${encodeURIComponent(sku.replace(/-/g, '+'))}`;
}
