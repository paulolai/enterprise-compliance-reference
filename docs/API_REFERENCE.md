# API Reference

This document describes all API endpoints available in the Executable Specifications Demo.

**Base URL**: `http://localhost:5173/api`

---

## Table of Contents

- [Pricing](#pricing)
- [Orders](#orders)
- [Products](#products)
- [Payments](#payments)
- [Authentication](#authentication)
- [Debug](#debug)
- [Health](#health)

---

## Pricing

### Calculate Price

Calculates pricing for a cart based on business rules defined in `pricing-strategy.md`.

**Endpoint**: `POST /api/pricing/calculate`

**Authentication**: None required

**Request Schema**:
```typescript
{
  items: Array<{
    sku: string;              // Product SKU
    quantity: number;         // Item quantity (1+)
    priceInCents: number;     // Base price per item
    weightInKg: number;       // Item weight in kg
    category: string;         // Product category
  }>;
  user?: {
    tenureYears: number;      // Customer tenure in years (0+)
  };
  method: 'standard' | 'priority' | 'pickup';  // Shipping method
}
```

**Response Schema**:
```typescript
{
  baseTotal: number;          // Base price in cents
  shippingCents: number;      // Shipping cost in cents
  discountCents: number;      // Total discount applied
  total: number;              // Final total in cents
  vipDiscount: number;        // VIP discount percentage (0-100)
  bulkDiscount: number;       // Bulk discount percentage (0-100)
  totalDiscount: number;      // Combined discount percentage
  breakdown: Array<{
    sku: string;
    quantity: number;
    priceInCents: number;
    bulkDiscount: number;
  }>;
}
```

**Status Codes**:
- `200` - Success
- `400` - Invalid request body
- `500` - Calculation error

**Example**:
```bash
curl -X POST http://localhost:5173/api/pricing/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "sku": "TH-001",
        "quantity": 2,
        "priceInCents": 2999,
        "weightInKg": 0.5,
        "category": "tv"
      }
    ],
    "user": { "tenureYears": 4 },
    "method": "standard"
  }'
```

**Rate Limits**: None (development)

---

## Orders

### Create Order

Creates a new order from cart state. Includes idempotency for payment intents.

**Endpoint**: `POST /api/orders`

**Authentication**: Bearer token (mock authentication)

**Request Schema**:
```typescript
{
  userId: string;
  items: Array<CartItem>;  // See PricingRequest
  total: number;           // Expected total (must match calculation)
  pricingResult: object;   // Pricing calculation result
  shippingAddress: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  stripePaymentIntentId: string;  // Stripe PaymentIntent ID
}
```

**Response Schema**:
```typescript
{
  orderId: string;        // Order ID
  status: 'paid';
  total: number;          // Order total in cents
}
```

**Status Codes**:
- `200` - Success (or existing order returned for idempotency)
- `400` - Invalid request, invariant violation
- `500` - Server error

**Example**:
```bash
curl -X POST http://localhost:5173/api/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer mock-token-xyz" \
  -d '{
    "userId": "user_123",
    "items": [...],
    "total": 5998,
    "pricingResult": {...},
    "shippingAddress": {...},
    "stripePaymentIntentId": "pi_123xyz"
  }'
```

---

### Get Order

Retrieves a specific order by ID with all items.

**Endpoint**: `GET /api/orders/:orderId`

**Authentication**: Bearer token

**Parameters**:
- `orderId` (path) - Order ID

**Response Schema**:
```typescript
{
  id: string;
  userId: string;
  status: 'paid' | 'cancelled';
  total: number;
  pricingResult: object;
  shippingAddress: object;
  stripePaymentIntentId: string;
  createdAt: number;      // Timestamp in ms
  updatedAt: number;      // Timestamp in ms
  items: Array<{
    id: string;
    sku: string;
    quantity: number;
    price: number;
    weightInKg: number;
    discount: number;
    createdAt: number;
  }>;
}
```

**Status Codes**:
- `200` - Success
- `404` - Order not found
- `400` - Parse error
- `500` - Server error

**Example**:
```bash
curl http://localhost:5173/api/orders/order_abc123 \
  -H "Authorization: Bearer mock-token-xyz"
```

---

### List Orders

Lists orders with optional filtering by user ID.

**Endpoint**: `GET /api/orders`

**Authentication**: Bearer token

**Query Parameters**:
- `userId` (optional) - Filter by user ID

**Response Schema**:
```typescript
{
  orders: Array<{
    id: string;
    userId: string;
    status: string;
    total: number;
    createdAt: number;
    updatedAt: number;
  }>;
}
```

**Status Codes**:
- `200` - Success
- `500` - Server error

**Example**:
```bash
curl http://localhost:5173/api/orders?userId=user_123 \
  -H "Authorization: Bearer mock-token-xyz"
```

---

### Delete Order

Deletes an order by ID. Cascades to order items.

**Endpoint**: `DELETE /api/orders/:orderId`

**Authentication**: Bearer token

**Parameters**:
- `orderId` (path) - Order ID

**Response Schema**:
```typescript
{
  success: true;
}
```

**Status Codes**:
- `200` - Success
- `404` - Order not found
- `500` - Server error

**Example**:
```bash
curl -X DELETE http://localhost:5173/api/orders/order_abc123 \
  -H "Authorization: Bearer mock-token-xyz"
```

---

## Products

### List Products

Retrieves all products in the catalog. Seeds products on first call.

**Endpoint**: `GET /api/products`

**Authentication**: None

**Query Parameters**:
- `limit` (optional) - Max results
- `offset` (optional) - Pagination offset

**Response Schema**:
```typescript
{
  products: Array<{
    sku: string;
    name: string;
    description: string;
    priceInCents: number;
    weightInKg: number;
    category: string;
  }>;
}
```

**Status Codes**:
- `200` - Success
- `500` - Server error

**Example**:
```bash
curl http://localhost:5173/api/products
```

---

### Get Product

Retrieves a single product by SKU.

**Endpoint**: `GET /api/products/:sku`

**Authentication**: None

**Parameters**:
- `sku` (path) - Product SKU

**Response Schema**:
```typescript
{
  sku: string;
  name: string;
  description: string;
  priceInCents: number;
  weightInKg: number;
  category: string;
  imageUrl?: string;
}
```

**Status Codes**:
- `200` - Success
- `404` - Product not found
- `500` - Server error

**Example**:
```bash
curl http://localhost:5173/api/products/TH-001
```

---

## Payments

### Create Payment Intent

Creates a Stripe PaymentIntent for checkout.

**Endpoint**: `POST /api/payments/create-intent`

**Authentication**: None (client-side only)

**Request Schema**:
```typescript
{
  amount: number;              // Amount in cents
  cartId: string;
  userId: string;
  cartItems: Array<CartItem>;
}
```

**Response Schema**:
```typescript
{
  paymentIntentId: string;
  clientSecret: string;        // For Stripe.js
  amount: number;
  currency: 'aud';
}
```

**Status Codes**:
- `200` - Success
- `400` - Invariant violation
- `401` - Stripe error
- `501` - Stripe not configured
- `500` - Server error

**Example**:
```bash
curl -X POST http://localhost:5173/api/payments/create-intent \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 5998,
    "cartId": "cart_123",
    "userId": "user_123",
    "cartItems": [...]
  }'
```

---

### Confirm Payment

Confirms a successful payment and creates the order.

**Endpoint**: `POST /api/payments/confirm`

**Authentication**: None

**Request Schema**:
```typescript
{
  paymentIntentId: string;
  cartItems: Array<CartItem>;
  shippingAddress: object;
}
```

**Response Schema**:
```typescript
{
  orderId: string;
  status: 'paid';
  total: number;
  paymentIntentId: string;
  createdAt: number;
}
```

**Status Codes**:
- `200` - Success
- `400` - Payment not successful
- `404` - PaymentIntent not found
- `501` - Stripe not configured
- `500` - Server error

---

### Cancel Payment

Cancels a Stripe PaymentIntent.

**Endpoint**: `POST /api/payments/cancel`

**Authentication**: None

**Request Schema**:
```typescript
{
  paymentIntentId: string;
  reason?: 'requested_by_customer' | 'duplicate' | 'fraudulent' | 'abandoned' | 'failed_invoice' | 'void_invoice';
}
```

**Response Schema**:
```typescript
{
  paymentIntentId: string;
  status: string;
}
```

**Status Codes**:
- `200` - Success
- `501` - Stripe not configured
- `500` - Server error

---

### Get Payment Intent

Retrieves a PaymentIntent status from Stripe.

**Endpoint**: `GET /api/payments/intent/:id`

**Authentication**: None

**Parameters**:
- `id` (path) - PaymentIntent ID

**Response Schema**:
```typescript
{
  paymentIntentId: string;
  status: string;
  amount: number;
  currency: 'aud';
  createdAt: number;
  metadata: Record<string, string>;
}
```

**Status Codes**:
- `200` - Success
- `404` - PaymentIntent not found
- `501` - Stripe not configured
- `500` - Server error

---

## Authentication

### Login

Authenticates a user. **Mock authentication for demo purposes only.**

**Endpoint**: `POST /api/auth/login`

**Authentication**: None

**Request Schema**:
```typescript
{
  email: string;
  password: string;  // Always "password" in demo
}
```

**Response Schema**:
```typescript
{
  user: {
    email: string;
    name: string;
    tenureYears: number;
  };
  accessToken: string;  // Mock token
}
```

**Status Codes**:
- `200` - Success
- `401` - Invalid credentials
- `400` - Request error

**Demo Users**:
| Email | Password | Tenure |
|-------|----------|--------|
| vip@techhome.com | password | 4 years |
| goldmember@store.com | password | 5 years |
| new@customer.com | password | 0 years |

**Example**:
```bash
curl -X POST http://localhost:5173/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "vip@techhome.com",
    "password": "password"
  }'
```

---

### Register

Registers a new user. **Mock registration for demo only.**

**Endpoint**: `POST /api/auth/register`

**Authentication**: None

**Request Schema**:
```typescript
{
  email: string;
  name: string;
}
```

**Response Schema**:
```typescript
{
  user: {
    email: string;
    name: string;
    tenureYears: number;  // Always 0 for new users
  };
  accessToken: string;
}
```

**Status Codes**:
- `200` - Success
- `400` - User already exists
- `400` - Request error

---

## Debug

> **Development Only**: Debug endpoints are disabled in production.

### Seed Session

Seeds a cart session for test automation. Allows tests to teleport to specific application states.

**Endpoint**: `POST /api/debug/seed-session`

**Authentication**: None

**Request Schema**:
```typescript
{
  cart: Array<CartItem>;
  user?: { email: string; tenureYears: number };
  shippingMethod?: 'standard' | 'priority' | 'pickup';
}
```

**Response Schema**:
```typescript
{
  success: true;
  itemCount: number;
  items: Array<CartItem & { addedAt: number }>;
  user: object;
  shippingMethod: string;
}
```

**Status Codes**:
- `200` - Success
- `400` - Validation error
- `404` - Disabled in production
- `500` - Server error

---

### Seed Auth

Seeds an authenticated session for tests.

**Endpoint**: `POST /api/debug/seed-auth`

**Authentication**: None

**Request Schema**:
```typescript
{
  email: string;
}
```

**Response Schema**:
```typescript
{
  success: true;
  user: {
    email: string;
    tenureYears: number;  // Auto-calculated (4 for "vip", 10 for "long", 0 otherwise)
  };
}
```

**Status Codes**:
- `200` - Success
- `400` - Validation error
- `404` - Disabled in production
- `500` - Server error

---

### Reset

Returns reset state data for clearing localStorage.

**Endpoint**: `POST /api/debug/reset`

**Authentication**: None

**Response Schema**:
```typescript
{
  success: true;
  items: [];
  user: null;
  shippingMethod: 'standard';
  pricingResult: null;
}
```

**Status Codes**:
- `200` - Success
- `404` - Disabled in production

---

## Health

### Liveness Probe

Simple check - returns 200 if app is running.

**Endpoint**: `GET /health`

**Authentication**: None

**Response Schema**:
```typescript
{
  status: 'ok';
  timestamp: string;  // ISO 8601
  uptime: number;     // Seconds
}
```

**Status Codes**:
- `200` - Alive

**Example**:
```bash
curl http://localhost:5173/health
```

---

### Readiness Probe

Checks if dependencies (database, Stripe) are healthy.

**Endpoint**: `GET /readyz`

**Authentication**: None

**Response Schema**:
```typescript
{
  status: 'ready' | 'not ready';
  timestamp: string;
  checks: {
    database: { status: 'healthy' | 'unhealthy'; message?: string };
    stripe: { status: 'healthy' | 'unhealthy'; message?: string };
    memory: { status: 'healthy' | 'unhealthy'; message?: string };
  };
}
```

**Status Codes**:
- `200` - All checks pass
- `503` - One or more checks failed

**Example**:
```bash
curl http://localhost:5173/readyz
```

---

### Detailed Health Status

Comprehensive health information with metrics.

**Endpoint**: `GET /livez`

**Authentication**: None

**Response Schema**:
```typescript
{
  status: 'alive';
  timestamp: string;
  uptime: number;
  resource: {
    memory: { heapUsed: string; heapTotal: string; rss: string; external: string };
    cpu: { user: string; system: string };
    node: { version: string; arch: string; platform: string; pid: number };
  };
  dependencies: object;  // Same as /readyz checks
  latency: {
    calculate_pricing: { count: number; avgMs: number; maxMs: number; minMs: number } | null;
    create_order: ...;
    // ... more actions
  };
}
```

**Status Codes**:
- `200` - Success

---

## Error Response Format

All error responses follow this format:

```typescript
{
  error: string;        // Human-readable error message
  // Additional fields may be present for specific errors
}
```

**Example 4xx Error**:
```json
{
  "error": "Order not found"
}
```

**Example 5xx Error**:
```json
{
  "error": "Failed to retrieve order"
}
```

---

## Common Headers

### Request Headers

| Header | Used By | Description |
|--------|---------|-------------|
| `Content-Type` | POST/PUT | Must be `application/json` |
| `Authorization` | Protected routes | `Bearer {token}` (mock auth) |

### Response Headers

| Header | Description |
|--------|-------------|
| `X-Content-Type-Options: nosniff` | Prevents MIME type sniffing |
| `X-Frame-Options: DENY` | Prevents clickjacking |
| `X-XSS-Protection: 1; mode=block` | XSS protection |
| `Strict-Transport-Security` | HTTPS enforcement (prod) |
| `Content-Security-Policy` | Resource loading policy |
| `Referrer-Policy` | Referrer info policy |
| `Permissions-Policy` | Browser feature permissions |

---

## Rate Limiting

Development mode: No rate limits

Production: Implement rate limiting using middleware.

---

## Webhooks

Not yet implemented. See `PRODUCTION_READY_PLAN.md` for roadmap.
