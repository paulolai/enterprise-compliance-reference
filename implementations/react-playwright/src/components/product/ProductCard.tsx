import { PriceDisplay } from '../ui/PriceDisplay';
import { productCatalog } from '../../store/cartStore';

interface ProductCardProps {
  sku: string;
}

export function ProductCard({ sku }: ProductCardProps) {
  const product = productCatalog.find((p) => p.sku === sku);

  if (!product) return null;

  const handleAddToCart = () => {
    // Emit an event for the cart to pick up
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
    <div className="product-card" data-testid={`product-card-${sku}`}>
      <div className="product-category">{product.category}</div>
      <h3 className="product-name">{product.name}</h3>
      <p className="product-description">{product.description}</p>
      <PriceDisplay amount={product.price} />
      <button
        className="add-to-cart-button"
        onClick={handleAddToCart}
        data-testid="add-to-cart"
      >
        Add to Cart
      </button>
    </div>
  );
}
