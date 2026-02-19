import { useParams, Link } from 'react-router-dom';
import { ProductDetail } from '../components/product/ProductDetail';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export function ProductDetailPage() {
  const { sku } = useParams<{ sku: string }>();

  if (!sku) {
    return <div>Product not found</div>;
  }

  return (
    <div className="space-y-6" data-testid="product-detail-page">
      <Button variant="ghost" asChild>
        <Link to="/products">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Products
        </Link>
      </Button>
      <ProductDetail sku={sku} />
    </div>
  );
}
