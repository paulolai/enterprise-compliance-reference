import { Link } from 'react-router-dom';
import { productCatalog } from '../store/cart-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

const categoryImages: Record<string, string> = {
  Electronics: 'https://placehold.co/400x300/3b82f6/white?text=Electronics',
  Home: 'https://placehold.co/400x300/22c55e/white?text=Home',
  Clothing: 'https://placehold.co/400x300/a855f7/white?text=Clothing',
};

export function HomePage() {
  const categories = [...new Set(productCatalog.map((p) => p.category))];

  return (
    <div className="space-y-12" data-testid="home-page">
      {/* Hero Section */}
      <section className="text-center space-y-4 py-12 bg-gradient-to-b from-primary/5 to-background rounded-lg">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Welcome to TechHome Direct
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Your one-stop shop for Electronics, Home Goods, and Clothing
        </p>
        <Button asChild size="lg" className="mt-4">
          <Link to="/products">
            Shop Now <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </section>

      {/* Categories Section */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold tracking-tight">Shop by Category</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <Link key={category} to={`/products?category=${category}`}>
              <Card className="group overflow-hidden transition-all hover:shadow-lg">
                <div className="aspect-video overflow-hidden">
                  <img
                    src={categoryImages[category] || 'https://placehold.co/400x300/gray/white?text=Category'}
                    alt={category}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                </div>
                <CardHeader>
                  <CardTitle className="group-hover:text-primary transition-colors">
                    {category}
                  </CardTitle>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Products Section */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold tracking-tight">Featured Products</h2>
          <Button variant="ghost" asChild>
            <Link to="/products">
              View All <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {productCatalog.slice(0, 4).map((product) => (
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
      </section>
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
