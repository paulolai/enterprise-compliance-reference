import { PriceDisplay } from '../ui/PriceDisplay';
import { productCatalog } from '../../store/cartStore';
import { useCartStore } from '../../store/cartStore';
import { toast } from 'react-hot-toast';

interface ProductDetailProps {
  sku: string;
}

export function ProductDetail({ sku }: ProductDetailProps) {
  const product = productCatalog.find((p) => p.sku === sku);
  const addItem = useCartStore((state) => state.addItem);

  if (!product) return <div>Product not found</div>;

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
    <div className="product-detail" data-testid="product-detail">
      <div className="product-breadcrumb">
        <span>Home</span> / <span>{product.category}</span> / <span>{product.name}</span>
      </div>

      <div className="product-hero">
        <h1 className="product-title">{product.name}</h1>
        <div className="product-sku">SKU: {product.sku}</div>
        <div className="product-price">
          <PriceDisplay amount={product.price} />
        </div>
      </div>

      <div className="product-info">
        <div className="product-category-badge">{product.category}</div>
        <p className="product-description">{product.description}</p>
        <div className="product-specs">
          <div>Weight: {product.weightInKg} kg</div>
        </div>

        <button
          className="add-to-cart-button primary"
          onClick={handleAddToCart}
          data-testid="add-to-cart"
        >
          Add to Cart
        </button>
      </div>
    </div>
  );
}
