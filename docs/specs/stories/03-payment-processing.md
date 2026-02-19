# Domain: Payment Processing

## Business Standards

### PCI DSS Compliance

**Payment Card Industry Data Security Standard** requirements:

1. **Never store raw card data:** We must never see, store, or transmit actual credit card numbers
2. **Use secure tokenization:** Stripe Elements handles card data securely
3. **Validate amounts:** Cannot charge $0 or negative amounts
4. **Clear error messages:** Users must understand why payment failed

Reference: [PCI DSS Summary](https://www.pcisecuritystandards.org/documents/PCIDSS_Summary.pdf)

### Consumer Protection Laws

**Australian Consumer Law requirements:**

1. **Final price shown before payment:** Customer must see exact amount they will be charged
2. **No surprise charges:** Final order amount must match what was displayed
3. **Confirmation provided:** Order confirmation with details must be shown after successful payment

### Internal Business Policies

**Revenue Protection:**
- Failed payments do NOT create orders (prevents phantom records)
- Payment amount must match cart total exactly
- Only successful payments create order records

**Customer Experience:**
- Clear, specific error messages (not just "Payment failed")
- User can retry failed payments
- Order ID provided on success for reference

### Why This Matters

- **PCI violation:** Massive fines if card data mishandled
- **Duplicate charges:** Customer complaints, chargebacks, brand damage
- **Lost revenue:** Payment failures that can't be retried = lost sales
- **Trust issues:** Unclear payment errors cause abandonment

---

## Domain Concepts

### Core Entities

| Entity | Attribute | Type | Description |
|--------|-----------|------|-------------|
| **PaymentIntent** | `id` | string | Stripe PaymentIntent ID |
| | `amount` | number | Payment amount in cents |
| | `currency` | string | Currency (aud) |
| | `status` | string | Stripe status enum |
| | `clientSecret` | string | Secret for frontend confirmation |
| **PaymentRequest** | `amount` | number | Amount to charge in cents |
| | `cartId` | string | Cart identifier |
| | `userId` | string | Customer ID |
| | `shippingAddress` | Address | Delivery address |
| **PaymentConfirmation** | `orderId` | string | Created order ID |
| | `paymentIntentId` | string | Stripe PaymentIntent ID |
| | `status` | string | Order status |
| | `total` | number| Amount charged |

### Stripe Integration Flow

```
Frontend                         Backend                          Stripe
    |                               |                                |
    |  1. POST /payments/...        |                                |
    |     create-intent            |                                |
    |---------------------------> |                                |
    |                               |  2. Create PaymentIntent       |
    |                               |------------------------------> |
    |                               |  3. Return PaymentIntent       |
    |                               |<------------------------------ |
    |  4. PaymentIntent + client   |                                |
    |     secret                    |                                |
    |<---------------------------  |                                |
    |                               |                                |
    |  5. User enters card          |                                |
    |     with Stripe Elements      |                                |
    |  6. User clicks Pay           |                                |
    |                               |                                |
    |  7. Stripe confirms payment   |                                |
    |     (clientSecret)            |                                |
    |------------------------------>                                |
    |                               |                                |
    |  8. POST /payments/confirm    |                                |
    |     with paymentIntentId      |                                |
    |---------------------------> |                                |
    |                               |  9. Verify PaymentIntent status|
    |                               | 10. Create order record        |
    |                               | 11. Return orderId, details    |
    | 12. Order confirmation       |                                |
    |<---------------------------  |                                |
```

### Ubiquitous Language

| Term | Definition |
|-------|------------|
| "PaymentIntent" | Stripe object representing a payment that may be completed |
| "clientSecret" | Secret token used by frontend to process payment with Stripe Elements |
| "Payment flow" | The sequence from checkout button to order confirmation |
| "Failed payment" | Payment rejected by Stripe or customer cancelled before confirm |

### Invariants

1. **Positive Amount:** Amount must be > 0 cents
2. **Payment Before Order:** Order is created only after successful payment
3. **Exact Amount:** Charged amount must match order total exactly
4. **No Duplicate Payments:** PaymentIntent ID should be used only once
5. **Status Consistency:** Order status 'paid' only if PaymentIntent 'succeeded'

---

## Workflow

### Payment Processing Workflow

```
1. User Enters Checkout
   └─ Cart must have at least 1 item
   └─ User logged in (or guest checkout)

2. Display Pricing
   └─ Call pricing API to calculate totals
   └─ Show final total to customer

3. User Enters Payment Details
   └─ Stripe Elements card input
   └─ Billing/shipping address

4. Create PaymentIntent
   ├─ Frontend: POST /api/payments/create-intent
   ├─ Backend: Validate amount > 0
   ├─ Backend: Create Stripe PaymentIntent
   └─ Backend: Return clientSecret

5. Customer Completes Payment
   ├─ Stripe Elements collects card data
   ├─ Customer clicks "Complete Payment"
   └─ Stripe processes card (succeeded, failed, or requires_action)

6. Confirm Payment & Create Order
   ├─ Frontend: POST /api/payments/confirm
   ├─ Backend: Verify PaymentIntent status = 'succeeded'
   ├─ Backend: Create order record in database
   ├─ Backend: Create order item records
   └─ Backend: Return orderId

7. Show Confirmation
   ├─ Order ID displayed
   ├─ Payment amount confirmed
   └─ Option to view order details
```

### Error Handling Flows

| Error Type | Source | User Action |
|------------|--------|-------------|
| Invalid amount | Server validation (amount <= 0) | Fix cart or refresh |
| Card declined | Stripe (fraud, expired, etc.) | Try different card |
| Insufficient funds | Stripe | Use different payment method |
| Card not supported | Stripe | Use supported card type |
| Network timeout | Stripe/API | Retry payment |
| PaymentIntent not found | Server/Stripe mismatch | Contact support (edge case) |

### Decision Points

| Decision | Condition | Outcome |
|----------|-----------|---------|
| Create PaymentIntent? | Cart total > 0 | Yes, proceed |
| Reject create-intent | Cart total <= 0 | Return 400 error |
| Create order? | PaymentIntent.status = 'succeeded' | Create order |
| Reject confirm | PaymentIntent.status != 'succeeded' | Return error, no order |
| Show error | Payment failed from Stripe | Show specific Stripe error |

---

## Scenario Mapping

| Scenario | Input | Expected Result |
|----------|-------|-----------------|
| **Valid successful payment** | Valid card, sufficient funds | Order created, success page |
| **Invalid amount** | Total = $0 | 400 error, no PaymentIntent created |
| **Negative amount** | Total = -$10 | 400 validation error |
| **Card declined** | Declined card | Error message, no order |
| **Insufficient funds** | Low balance card | Specific error, no order |
| **Expired card** | Card past expiry | Error, suggest update |
| **Network timeout** | Stripe timeout | Error, allow retry |
| **User cancels** | User abandons checkout | No order, no charge |
| **Duplicate confirm** | Confirm same PaymentIntent twice | Idempotent, return existing order |

### Edge Cases

| Scenario | What to Handle |
|----------|----------------|
| Cart changes during payment | Use cart state at PaymentIntent creation |
| Price changes before checkout | Use pricing at time of PaymentIntent create |
| PaymentIntent creation fails | Clear error message, allow retry |
| Simultaneous payments | Idempotency on PaymentIntent ID |
| Midnight price changes | Price preserved at checkout time |

---

## Test Specifications

### API Integration Tests (Already Exists)

**Location:** `implementations/executable-specs/e2e/src/test/api/payments-api.spec.ts`

| Test | Description | Metadata |
|------|-------------|----------|
| create-intent returns clientSecret | Valid cart returns PaymentIntent with clientSecret | @critical |
| create-intent validates amount > 0 | Zero amount returns 400 error | @validation |
| create-intent validates positive | Negative amount returns 400 | @validation |
| create-intent includes metadata | Cart info in PaymentIntent metadata | @audit |
| confirm creates order on success | Successful payment = order record in DB | @critical, @business-rule |
| confirm returns order details | Response includes orderId, total, status | @comprehensive |
| confirm fails on non-success | Failed PaymentIntent = 400 error, no order | @business-rule |
| confirm not found | Invalid PaymentIntent ID = 404 | @validation |
| Stripe error propagated | Card declined = Stripe error message | @integration |
| Idempotent confirm | Confirming twice returns same order | @robustness |

### E2E Tests (Already Exists)

**Location:** `implementations/executable-specs/e2e/src/test/e2e/checkout-complete-flow.ui.test.ts`

| Test | Description |
|------|-------------|
| Complete payment flow | From checkout to confirmation page |
| Card declined shows error | User sees specific error message |
| Insufficient funds shows error | Clear messaging for retry |
| Order confirmation contains details | Order ID, total, items displayed |
| Back button after payment | Prevents duplicate charges |

---

## Technical Implementation

### Where the Code Lives

| Component | Location | Status |
|-----------|----------|--------|
| Payments Route | `implementations/executable-specs/e2e/src/server/routes/payments.ts` | ✅ Complete |
| Database Orders | `implementations/executable-specs/shared/src/db/schema.ts` | ✅ Complete |
| API Tests | `implementations/executable-specs/e2e/src/test/api/payments-api.spec.ts` | ✅ Complete |
| E2E Flow Tests | `implementations/executable-specs/e2e/src/test/e2e/checkout-complete-flow.ui.test.ts` | ✅ Complete (Mocked) |
| Checkout Page | `implementations/executable-specs/e2e/src/pages/CheckoutPage.tsx` | ✅ Complete |

### API Endpoints

**Create PaymentIntent:**
```
POST /api/payments/create-intent

Request:
{
  amount: number;        // Amount in cents (must be > 0)
  cartId: string;
  userId: string;
  metadata?: object;     // Optional additional data
}

Response:
{
  paymentIntentId: string;
  clientSecret: string;
  amount: number;
  currency: string;
}
```

**Confirm Payment and Create Order:**
```
POST /api/payments/confirm

Request:
{
  paymentIntentId: string;
  cartItems: CartItem[];    // For order creation
  shippingAddress: Address;
}

Response:
{
  orderId: string;
  total: number;
  status: 'paid';
  paymentIntentId: string;
  createdAt: string;
}
```

### Required Dependencies

```bash
# Stripe SDK
npm install stripe

# Environment variable required
STRIPE_SECRET_KEY=sk_test_...
```

### Stripe Test Mode

For development and testing, use:
- Stripe Test Mode (not real charges)
- Test card numbers: https://stripe.com/docs/testing
- Webhooks not required for initial implementation

---

## Completion Criteria

This domain is complete when:

- [x] All domain specs documented
- [x] `/api/payments/create-intent` endpoint implemented
- [x] `/api/payments/confirm` endpoint implemented
- [x] Stripe test mode integration working
- [x] API integration tests pass (with mocked Stripe)
- [x] E2E payment flow tests pass
- [x] Orders created only on successful payment
- [x] Clear error messages for failed payments
- [x] Attestation reports show full coverage

---

## References

- [Stripe API Payment Intents](https://stripe.com/docs/api/payment_intents)
- [Stripe Testing Cards](https://stripe.com/docs/testing)
- `DEEP_DOMAIN_UNDERSTANDING.md` - Methodology
- `01-pricing-calculation.md` - Pricing rules
- `04-order-persistence.md` - Order database schema
