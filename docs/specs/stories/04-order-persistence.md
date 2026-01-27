# Domain: Order Persistence

## Business Standards

### Financial Compliance Requirements

**Auditable records:**
- Every transaction must be permanently recorded
- Order records must preserve exact pricing at time of purchase
- Changes to products must not affect historical orders
- Records must support financial reconciliation

### Data Retention Policy

**Internal policy:**
- Order records never deleted (soft delete only if at all)
- Order items cascade with parent order
- Timestamps on all records for audit trail

### Business Value

**Why order persistence matters:**
1. **Financial Reconciliation:** Match payments to orders
2. **Customer Service:** Look up and reference past orders
3. **Analytics:** Revenue reporting, product performance
4. **Dispute Resolution:** Customer questions about charges
5. **Reorder Functionality:** Easy repurchase from history

---

## Domain Concepts

### Core Entities

| Entity | Attribute | Type | Description |
|--------|-----------|------|-------------|
| **Order** | `id` | string (UUID) | Primary key |
| | `userId` | string | Customer who placed order |
| | `status` | enum | pending, paid, processing, shipped, delivered, cancelled |
| | `total` | number | Final amount in cents |
| | `pricingResult` | JSON | Complete pricing breakdown |
| | `shippingAddress` | JSON | Delivery address |
| | `stripePaymentIntentId` | string | Link to Stripe payment |
| | `createdAt` | datetime | Order timestamp |
| | `updatedAt` | datetime | Last update |
| **OrderItem** | `id` | string (UUID) | Primary key |
| | `orderId` | string (FK) | Parent order |
| | `sku` | string | Product SKU |
| | `quantity` | number | Items purchased |
| | `price` | number | Price AT PURCHASE (cents) |
| | `weightInKg` | number | For historical reference |
| | `discount` | number | Total discount on this line |
| | `createdAt` | datetime | Timestamp |
| **Product** | `sku` | string (PK) | Product identifier |
| | `name` | string | Product name |
| | `description` | string | Product description |
| | `priceInCents` | number | Current list price |
| | `weightInKg` | number | Shipping weight |
| | `category` | string | Product category |
| | `imageUrl` | string | Product image URL |

### Entity Relationships

```
User (customer)
  └─ 1:N ── Order
            └─ 1:M ── OrderItem
                       └─ N:1 ── Product
```

### Ubiquitous Language

| Term | Definition |
|-------|------------|
| "Order" | A completed purchase with payment confirmed |
| "Order Item" | A single product line within an order |
| "Preserved pricing" | Price saved at time of purchase, never changes |
| "Cascade delete" | Deleting order deletes all its order items |

### Invariants

1. **Foreign Key Integrity:** All order items must reference valid order
2. **Cascade Deletion:** Order deleted → all order items deleted
3. **Preserved Pricing:** OrderItem.price never changes after order creation
4. **Positive Totals:** Order total > 0
5. **User Association:** Every order must have a userId
6. **Order Item Quantity:** All orderItem.quantity >= 1
7. **Schema Integrity:** SKU in orderItem must match a valid product

---

## Workflow

### Order Creation Workflow

```
1. Payment Confirmed
   └─ Stripe PaymentIntent status = 'succeeded'

2. Create Order Record
   ├─ Generate UUID for orderId
   ├─ Set userId from session
   ├─ Set status = 'paid'
   ├─ Set total = payment amount
   ├─ Store pricingResult as JSON
   ├─ Store shippingAddress as JSON
   ├─ Set stripePaymentIntentId
   └─ Timestamp createdAt, updatedAt

3. Create Order Item Records
   └─ For each cart item:
       ├─ Generate UUID for orderItemId
       ├─ Set orderId (FK)
       ├─ Set sku
       ├─ Set quantity
       ├─ Set price from cart (preserved)
       ├─ Set weightInKg for historical record
       └─ Set discount from pricing breakdown

4. Return Order Details
   └─ orderId, total, status, items
```

### Order Retrieval Workflow

```
1. Get Order by ID
   ├─ Query orders table by orderId
   ├─ Query orderItems table by orderId
   └─ JOIN with products to get current product info

2. Get User's Orders
   ├─ Query orders table by userId
   ├─ Order by createdAt DESC (newest first)
   └─ Include order items
```

### Order Status Changes

```
pending → paid → processing → shipped → delivered
   ↓
cancelled
```

---

## Scenario Mapping

| Scenario | Action | Expected Result |
|----------|--------|-----------------|
| **Create order from cart** | POST /api/orders with cart items | Order + items created in DB |
| **Retrieve order by ID** | GET /api/orders/:id | Order with all items returned |
| **Retrieve user orders** | GET /api/orders/user/:userId | All user's orders, newest first |
| **Empty cart order attempt** | POST with empty cart | 400 error, no order created |
| **Invalid product SKU** | POST with non-existing SKU | 400 error, no order created |
| **Delete order** | DELETE /api/orders/:id | Order + all items cascade deleted |
| **Get order count** | Count orders by status | Correct aggregate returned |
| **Product price changes** | Update product.priceInCents | Historical orders unchanged |

### Edge Cases

| Scenario | What to Handle |
|----------|----------------|
| Duplicate order creation | Idempotency on paymentIntentId |
| Order with no items | Reject with validation error |
| Missing userId | Require authentication |
| Referential integrity violation | Transaction rollback |
| Concurrent order creation | Database locks/transactions |
| Very large order | No theoretical limit, but practical |

---

## Test Specifications

### Unit Tests (Already Exists)

**Location:** `implementations/typescript-vitest/test/database/schema.spec.ts`

| Test | Description |
|------|-------------|
| Schema definitions correct | All tables have required columns |
| Column types correct | Numbers, strings, dates as expected |
| Required fields enforced | NOT NULL constraints work |
| Foreign key constraints | OrderItem -> Order FK enforced |
| Cascade delete works | Delete order → items deleted |

### Migration Tests (Already Exists)

**Location:** `implementations/typescript-vitest/test/database/migrations.spec.ts`

| Test | Description |
|------|-------------|
| Migration creates tables | drizzle-kit push creates all tables |
| Migration is idempotent | Running twice doesn't fail |
| Seed data consistent | Same products seeded each time |

### API Integration Tests (Already Exists)

**Location:** `implementations/react-playwright/src/test/api/orders-api.spec.ts`

| Test | Description | Metadata |
|------|-------------|----------|
| POST creates order | Order + items in database | @critical |
| POST returns order ID | Response includes orderId | @comprehensive |
| GET returns order with items | All order items included | @comprehensive |
| GET by userId filters | Only user's orders returned | @privacy |
| GET orders ordered by date | Newest orders first | @business-rule |
| Empty cart rejected | 400 error on empty items | @validation |
| Invalid SKU rejected | 400 error on unknown SKU | @validation |
| Delete cascades | Order + items all deleted | @integrity |
| Orders preserve prices | Historical prices unchanged | @audit |

---

## Technical Implementation

### Where the Code Lives

| Component | Location | Status |
|-----------|----------|--------|
| Database Schema | `implementations/shared/src/db/schema.ts` | ✅ Complete |
| Database Connection | `implementations/shared/src/db/index.ts` | ✅ Complete |
| Seed Script | `implementations/shared/src/db/seed.ts` | ✅ Complete |
| Orders Route | `implementations/react-playwright/src/server/routes/orders.ts` | ✅ Complete |
| Products Route | `implementations/react-playwright/src/server/routes/products.ts` | ✅ Complete |
| Drizzle Config | `drizzle.config.ts` | ✅ Complete |
| Unit Tests | `implementations/typescript-vitest/test/database/` | ✅ Complete |
| API Tests | `implementations/react-playwright/src/test/api/orders-api.spec.ts` | ✅ Complete |

### Database Schema (Drizzle)

```typescript
// orders table
export const orders = sqliteTable('orders', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  status: text('status').notNull().default('pending'),
  total: integer('total').notNull(),
  pricingResult: text('pricing_result').notNull(), // JSON string
  shippingAddress: text('shipping_address').notNull(), // JSON string
  stripePaymentIntentId: text('stripe_payment_intent_id').notNull(),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

// orderItems table
export const orderItems = sqliteTable('order_items', {
  id: text('id').primaryKey(),
  orderId: text('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  sku: text('sku').notNull(),
  quantity: integer('quantity').notNull(),
  price: integer('price').notNull(),
  weightInKg: integer('weight_in_kg').notNull(),
  discount: integer('discount').notNull().default(0),
  createdAt: integer('created_at').notNull(),
});

// products table
export const products = sqliteTable('products', {
  sku: text('sku').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  priceInCents: integer('price_in_cents').notNull(),
  weightInKg: integer('weight_in_kg').notNull(),
  category: text('category').notNull(),
  imageUrl: text('image_url'),
});
```

### API Endpoints

**Create Order:**
```
POST /api/orders

Request:
{
  userId: string;
  items: Array<{
    sku: string;
    quantity: number;
    price: number;
    weightInKg: number;
    discount?: number;
  }>;
  total: number;
  pricingResult: PricingResult;
  shippingAddress: Address;
  stripePaymentIntentId: string;
}

Response:
{
  orderId: string;
  status: string;
  total: number;
}
```

**Get Order by ID:**
```
GET /api/orders/:id

Response:
{
  id: string;
  userId: string;
  status: string;
  total: number;
  items: OrderItem[];
  createdAt: string;
}
```

**Get User Orders:**
```
GET /api/orders/user/:userId

Response:
{
  orders: Order[];
  userId: string;
}
```

**Get Products:**
```
GET /api/products

Response:
{
  products: Product[];
}
```

### Required Dependencies

```bash
# Database
npm install drizzle-orm better-sqlite3
npm install -D drizzle-kit
```

### Environment Variables

```bash
# Database
DATABASE_PATH=./data/shop.db
```

---

## Completion Criteria

This domain is complete when:

- [x] All domain specs documented
- [x] Drizzle schema defined
- [x] Database migrations run successfully
- [x] Products seeded (11 products)
- [x] POST /api/orders creates orders with items
- [x] GET /api/orders/:id returns order details
- [x] GET /api/orders/user/:userId returns user's orders
- [x] GET /api/products returns product catalog
- [x] Cascade delete working
- [x] All unit tests pass
- [x] All API tests pass
- [x] Attestation reports show full coverage

---

## References

- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [better-sqlite3 documentation](https://github.com/WiseLibs/better-sqlite3)
- `DEEP_DOMAIN_UNDERSTANDING.md` - Methodology
- `03-payment-processing.md` - Payment integration
