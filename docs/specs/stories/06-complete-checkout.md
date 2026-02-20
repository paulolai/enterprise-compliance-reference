# Domain: Complete Checkout Flow

## Business Standards

### The Happy Path Story

This is the end-to-end customer journey from viewing products to completing a purchase:

```
Customer discovers product → Adds to cart → Views cart → Enters checkout
→ Selects shipping → Views pricing → Enters payment → Order confirmed
```

Every step must be smooth, clear, and trustworthy.

### Conversion Psychology

**Friction points kill conversion:**

1. **Cart issues:** If cart doesn't work, no purchase
2. **Unclear pricing:** Hidden costs = abandonment
3. **Payment failure:** Unclear errors = frustration
4. **No confirmation:** Was payment successful? Anxiety

**Best practices:**
- Show pricing at each step
- Clear error messages
- Visual confirmation of success
- Order ID for reference

### Cross-Domain Integration

This domain ties together all others:

| Domain | Role in Checkout |
|--------|------------------|
| Pricing | Calculate totals, discounts, shipping |
| Cart | Hold items being purchased |
| Payment | Process Stripe payment |
| Orders | Create persistent record |

---

## Domain Concepts

### The Checkout Journey

| Step | Domain | What Happens |
|------|--------|--------------|
| **1. Browse Products** | N/A | User views catalog |
| **2. Add to Cart** | Cart | Items added to cart state |
| **3. View Cart** | Cart | Review items, quantities |
| **4. Enter Checkout** | Pricing | Totals calculated |
| **5. Enter Address** | N/A | Shipping address entered |
| **6. Select Shipping** | Pricing | Shipping method chosen |
| **7. Review Pricing** | Pricing | Final totals displayed |
| **8. Enter Payment** | Payment | Stripe Elements collects card |
| **9. Complete Payment** | Payment/Orders | Payment → Order created |
| **10. View Confirmation** | Orders | Order ID, details shown |

### Ubiquitous Language

| Term | Definition |
|-------|------------|
| "Checkout flow" | The complete journey from cart to order confirmation |
| "Conversion" | Successful purchase (payment + order created) |
| "Cart abandonment" | User leaves without completing purchase |

### Integration Invariants

1. **Cart to Order:** Order items exactly match cart items at payment time
2. **Pricing Consistency:** Totals shown in UI = totals charged = totals stored
3. **Payment to Order:** Order created ONLY after successful payment
4. **Idempotence:** Cannot complete same cart/payment twice (new order per payment)

---

## Workflow

### Complete Checkout Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. CUSTOMER JOURNEY                                             │
└─────────────────────────────────────────────────────────────────┘
   ↓
   ├─ Browse Products (/products)
   │  └─ View catalog, filter by category
   ↓
   ├─ Add to Cart
   │  └─ Cart state updated, badge shows count
   ↓
   ├─ View Cart (/cart)
   │  └─ Review items, adjust quantities, remove items
   ↓
   ├─ Enter Checkout (/checkout)
   │  ├─ Pricing calculated via /api/pricing/calculate
   │  └─ Totals displayed clearly
   ↓
   ├─ Enter Shipping Address
   │  └─ Address form with validation
   ↓
   ├─ Select Shipping Method
   │  ├─ Standard / Expedited / Express options
   │  └─ Pricing updates based on selection
   ↓
   ├─ Review Order Summary
   │  ├─ Items list with quantities
   │  ├─ Discounts shown
   │  ├─ Shipping cost shown
   │  └─ Grand total clearly labeled
   ↓
   ├─ Enter Payment Details
   │  ├─ Stripe Elements card input
   │  └─ Billing address
   ↓
   ├─ Click "Complete Payment"
   │  └─ Button disabled during processing
   ↓
   └─ Order Confirmation (/order-confirmation)
      ├─ Order ID shown prominently
      ├─ Payment confirmation
      └─ Option to view order details or continue shopping
```

### API Sequence

```
Frontend ────────────────────────────────────────────────────────────┐
                                                                   │
1. GET /api/products              → Get product catalog            │
2. Cart store.addItem()           → Update cart (client-side)      │
3. POST /api/pricing/calculate   → Get totals with discounts       │
4. POST /api/payments/...        → Create Stripe PaymentIntent     │
      create-intent                                               │
5. (Stripe handles payment)       → User completes payment         │
6. POST /api/payments/confirm    → Verify payment, create order   │
7. GET /api/orders/:id           → Get order details for display   │
                                                                   │
Backend──────────────────────────────────────────────────────────┘

- Pricing Engine (shared)
- Stripe SDK
- Database (orders, orderItems)
```

---

## Scenario Mapping

### The Happy Path

| Step | User Action | System Response |
|------|-------------|-----------------|
| 1 | View products | Product catalog displayed |
| 2 | Click "Add to Cart" | Cart badge updates (no alert) |
| 3 | Click "Checkout" | Redirected to /checkout, totals shown |
| 4 | Enter address | Address saved in state |
| 5 | Select "Standard" | Pricing updates, shipping shown |
| 6 | Enter card details | Stripe Elements collects card |
| 7 | Click "Complete Payment" | Processing indicator |
| 8 | Payment succeeds | Order created, redirected to confirmation |
| 9 | View confirmation | Order ID, details displayed |

### Alternative Paths

| Scenario | What Happens |
|----------|--------------|
| **Empty cart to checkout** | Redirect to products with message |
| **Guest checkout** | Create anonymous user record |
| **Payment declined** | Show error, allow retry same card |
| **Insufficient funds** | Show specific error, suggest other payment |
| **Network timeout** | Show error, allow retry (no duplicate order) |
| **Back button after payment** | Redirect to confirmation page |
| **Refresh on confirmation** | Still shows confirmation |

### Edge Cases

| Scenario | What to Handle |
|----------|----------------|
| Cart changes during checkout | Use cart state at payment time |
| Price changes before checkout | Preserve pricing at checkout |
| Multiple browser tabs | Use same session cart state |
| Payment timeout | Allow retry with same PaymentIntent |
| User creates two orders consecutively | Generate distinct order IDs |

---

## Test Specifications

### E2E Tests End-to-End (Already Exists)

**Location:** `test/e2e/checkout-complete-flow.ui.test.ts`

| Test | Description | Metadata |
|------|-------------|----------|
| Complete purchase flow | From products to confirmation | @critical, @happy-path |
| Cart persistence through checkout | Cart survives reload | @robustness |
| Pricing accuracy displayed | UI matches API | @compliance |
| Free shipping badge appears | When applicable | @business-rule |
| Express shipping fixed rate | Always $25 | @business-rule |
| Payment declined handled | Error shown, order NOT created | @error-handling |
| Confirmation page shows details | Order ID, total, items | @comprehensive |
| Back button after checkout | Redirects to confirmation | @ux |
| Guest checkout works | No login required | @feature |
| Payment timeout retry | Allow retry, no duplicate | @robustness |

### Integration Context

These tests verify all domains work together:

| Domain Integration | What's Tested |
|-------------------|---------------|
| Cart → Pricing | Cart items produce correct totals |
| Pricing → Payment | Totals match payment amount |
| Payment → Orders | Successful payment creates order |
| Cart → Order Items | Cart items become order items |
| Stripe → Database | PaymentIntent linked to order |

---

## Technical Implementation

### Where the Code Lives

| Component | Location | Status |
|-----------|----------|--------|
| Products Page | `packages/client/src/pages/ProductsPage.tsx` | ✅ Complete |
| Product Detail Page | `packages/client/src/pages/ProductDetailPage.tsx` | ✅ Complete |
| Cart Page | `packages/client/src/pages/CartPage.tsx` | ✅ Complete |
| Checkout Page | `packages/client/src/pages/CheckoutPage.tsx` | ✅ Complete |
| Confirmation Page | `packages/client/src/pages/OrderConfirmationPage.tsx` | ❌ Missing |
| Cart Store | `packages/client/src/store/cartStore.ts` | ✅ Complete |
| Pricing Route | `packages/server/src/server/routes/pricing.ts` | ✅ Complete |
| Payments Route | `packages/server/src/server/routes/payments.ts` | ✅ Complete |
| Orders Route | `packages/server/src/server/routes/orders.ts` | ✅ Complete |

### Critical Integrations

1. **Cart → Pricing API:**
   ```typescript
   // CheckoutPage.tsx
   const { items, user, shippingMethod } = cartStore;
   const result = await fetch('/api/pricing/calculate', {
     method: 'POST',
     body: JSON.stringify({ items, user, shippingMethod }),
   });
   ```

2. **Pricing → Payment:**
   ```typescript
   const paymentIntent = await stripe.confirmPayment({
     clientSecret,
     confirmParams: {
       return_url: `${window.location.origin}/checkout`,
     },
   });
   ```

3. **Payment → Order:**
   ```typescript
   if (paymentIntent.status === 'succeeded') {
     const order = await fetch('/api/payments/confirm', {
       method: 'POST',
       body: JSON.stringify({
         paymentIntentId: paymentIntent.id,
         cartItems: cartStore.items,
         shippingAddress,
       }),
     });
     router.push(`/order-confirmation/${order.orderId}`);
   }
   ```

### Missing Components

1. **Order Confirmation Page:** Needs to show order details
2. **Stripe Elements Integration:** Checkout page needs Stripe React components
3. **Payment Loading State:** Visual feedback during Stripe processing
4. **Error Boundaries:** Handle Stripe/API failures gracefully

---

## Completion Criteria

This domain is complete when:

- [x] All domain specs documented
- [x] Complete E2E flow from products to confirmation works
- [x] Payment declined handled gracefully
- [ ] Order confirmation page shows order details
- [x] Back button after payment works
- [x] All end-to-end tests pass
- [x] Pricing displayed matches pricing engine
- [x] Orders created only on successful payment
- [ ] Attestation reports show coverage across all domains

---

## References

- `01-pricing-calculation.md` - Pricing rules and calculations
- `02-cart-management.md` - Cart state and persistence
- `03-payment-processing.md` - Stripe integration
- `04-order-persistence.md` - Order creation and storage
- `DEEP_DOMAIN_UNDERSTANDING.md` - Methodology
