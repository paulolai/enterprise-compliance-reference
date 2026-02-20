# CartBuilder Quick Reference

A fluent API for creating test cart states in TypeScript.

---

## Basic Usage

```typescript
import { CartBuilder } from '@executable-specs/shared/fixtures';

// Simple cart
const result = CartBuilder.new()
  .withItem({ name: 'iPad', price: 100000, quantity: 1 })
  .calculate();

// With VIP user
const result = CartBuilder.new()
  .withItem({ name: 'iPad', price: 100000, quantity: 3 })
  .asVipUser()
  .calculate();
```

---

## Method Reference

### Setup Methods

| Method | Description | Example |
|--------|-------------|---------|
| `new()` | Create a new empty cart | `CartBuilder.new()` |
| `withItem(params)` | Add an item to cart | `.withItem({ name: 'iPad', price: 100000, quantity: 2 })` |
| `asVipUser()` | Set user as VIP (tenure = 3 years) | `.asVipUser()` |
| `withTenure(years)` | Set custom tenure | `.withTenure(5)` |
| `withShipping(method)` | Set shipping method | `.withShipping(ShippingMethod.EXPRESS)` |
| `withStandardShipping()` | Standard shipping ($7 + weight) | `.withStandardShipping()` |
| `withExpeditedShipping()` | Expedited (15% surcharge) | `.withExpeditedShipping()` |
| `withExpressShipping()` | Express ($25 flat) | `.withExpressShipping()` |
| `withTracer(tracer)` | Add logging tracer | `.withTracer(myTracer)` |

### Item Parameters

```typescript
interface ItemBuilderParams {
  name: string;        // Product name (used for SKU if not provided)
  price: Cents;       // Price in cents (e.g., 10000 = $100.00)
  quantity?: number;   // Default: 1
  sku?: string;       // Default: uppercase name with underscores
  weightInKg?: number; // Default: 1.0 kg
}
```

---

## Common Patterns

### Simple Cart
```typescript
CartBuilder.new()
  .withItem({ name: 'Widget', price: 1000 })
  .calculate();
```

### Bulk Discount Test (3+ items)
```typescript
CartBuilder.new()
  .withItem({ name: 'Widget', price: 10000, quantity: 5 })
  .calculate();
```

### VIP User
```typescript
CartBuilder.new()
  .withItem({ name: 'Widget', price: 10000 })
  .asVipUser() // tenure = 3 years
  .calculate();
```

### Custom Tenure
```typescript
CartBuilder.new()
  .withItem({ name: 'Widget', price: 10000 })
  .withTenure(1) // 1 year = NOT VIP (need > 2)
  .calculate();
```

### Combined Discounts
```typescript
CartBuilder.new()
  .withItem({ name: 'Widget', price: 10000, quantity: 3 }) // Bulk
  .asVipUser() // VIP
  .calculate();
```

### With Shipping
```typescript
CartBuilder.new()
  .withItem({ name: 'Widget', price: 10000, weightInKg: 2.5 })
  .withExpeditedShipping()
  .calculate();
```

### Accessing Inputs/Outputs

```typescript
const builder = CartBuilder.new()
  .withItem({ name: 'Widget', price: 10000 })
  .asVipUser();

const result = builder.calculate('my-test');

// Access the input that was used
const inputs = builder.getInputs();
// { items: [...], user: { tenureYears: 3 }, shippingMethod: 'STANDARD' }
```

---

## Price Conversions

| Cents | Dollars | Usage |
|-------|---------|-------|
| `1000` | $10.00 | `price: 1000` |
| `10000` | $100.00 | `price: 10000` |
| `100000` | $1,000.00 | `price: 100000` |

**Tip:** Always work in cents to avoid floating-point issues!

---

## Related

- See `docs/TEACHING_GUIDE.md` for full tutorial
- See `packages/shared/fixtures/cart-builder.ts` for source
- See `pricing-strategy.md` for business rules
