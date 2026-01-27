# Domain: Pricing Calculation

## Business Standards

### External Regulations & Standards

**Consumer Protection Laws:**
- In Australia, the **Australian Consumer Law** requires that customers see the final price (including all taxes, fees, and charges) before making a purchase decision.
- Misleading pricing or "price baiting" (advertising a price that then changes) is unlawful.
- Reference: [ACCC Pricing guidelines](https://www.accc.gov.au/consumers/pricing)

### Internal Business Policies

**Revenue Protection:**
- prices must never increase during checkout
- maximum discount cap prevents margin erosion

**Accuracy Requirements:**
- All monetary values in cents (integer arithmetic)
- No floating-point precision errors
- GST (10%) included in all base prices

**Why this matters:**
- Pricing errors lead to customer complaints, returns, and chargebacks
- Revenue leakage from under-pricing directly impacts profitability
- Price transparency builds trust and reduces cart abandonment

### Primary Reference
- `docs/pricing-strategy.md` - Complete pricing rules and invariants

---

## Domain Concepts

### Core Entities

| Entity | Attribute | Type | Description |
|--------|-----------|------|-------------|
| **CartItem** | `sku` | string | Product identifier |
| | `priceInCents` | number | Price at checkout (preserved) |
| | `quantity` | number | Items in cart |
| | `weightInKg` | number | For shipping calculation |
| **User** | `tenureYears` | number | Customer length of relationship |
| | `isVIP` | boolean | Derived: tenureYears > 2 |
| **PricingResult** | `originalTotal` | number | Sum before any discounts |
| | `finalTotal` | number | After discounts, before shipping |
| | `grandTotal` | number | Final including shipping |
| | `totalDiscount` | number | Sum of all discounts applied |
| | `lineItems` | LineItemResult[] | Per-item breakdown |

### Derived Concepts

| Concept | Rule |
|---------|------|
| **Bulk Discount** | 15% off items where quantity >= 3 |
| **VIP Discount** | 5% off subtotal if tenureYears > 2 |
| **Safety Valve** | Total discount capped at 30% of original total |
| **Free Shipping** | Applies when finalTotal > $100 |

### Ubiquitous Language

| Term | Definition |
|-------|------------|
| "Original Total" | Sum of (item price × quantity) for all items |
| "Subtotal" | After bulk discounts, before VIP |
| "Final Total" | After all discounts, before shipping |
| "Grand Total" | After discounts + shipping |

### Invariants

1. **Revenue Protection:** `grandTotal >= 0`
2. **No Surprise Price Hikes:** `finalTotal <= originalTotal`
3. **Discount Cap:** `totalDiscount <= 0.30 × originalTotal`
4. **Integer Math:** All values represent exact cents
5. **VIP Definition:** `isVIP` is true iff `tenureYears > 2`
6. **Bulk Threshold:** Items with quantity >= 3 receive exactly 15% discount
7. **Free Shipping Threshold:** If `finalTotal > 10000` cents, standard shipping = $0

---

## Workflow

### Step-by-Step Pricing Calculation

```
1. Calculate Original Total
   └─ SUM(item.priceInCents × item.quantity) for all items

2. Apply Bulk Discounts (per line item)
   ├─ For each item where quantity >= 3
   ├─ Apply 15% discount to that line
   └─ Accumulate volumeDiscountTotal

3. Calculate Post-Bulk Subtotal
   └─ originalTotal - volumeDiscountTotal

4. Apply VIP Discount (if eligible)
   ├─ If isVIP: 5% of post-bulk subtotal
   └─ Else: 0

5. Calculate Uncapped Total Discount
   └─ volumeDiscountTotal + vipDiscount

6. Apply Safety Valve Discount Cap
   ├─ If uncappedDiscount > 30% of originalTotal
   └─ Cap totalDiscount at exactly 30% × originalTotal

7. Calculate Final Product Total
   └─ originalTotal - cappedTotalDiscount

8. Calculate Shipping
   ├─ Express: Fixed $25
   ├─ Free Shipping Threshold: If finalTotal > $100 → $0 (standard/expedited)
   ├─ Expedited: Base + Weight + 15% of originalTotal
   └─ Standard: Base ($7) + Weight ($2/kg)

9. Calculate Grand Total
   └─ finalProductTotal + shipping
```

### Decision Points

| Decision | Condition | Outcome |
|----------|-----------|---------|
| Bulk discount | quantity >= 3 | Apply 15% to line item |
| VIP eligibility | tenureYears > 2 | Apply 5% to subtotal |
| Discount cap | totalDiscount > 30% of original | Cap at 30% |
| Free shipping | finalTotal > $100 AND NOT Express | Shipping = $0 |
| Express shipping | method = EXPRESS | Shipping = $25 |

---

## Scenario Mapping

| Scenario | Input | Expected Calculation |
|----------|-------|----------------------|
| **Single item, no discounts** | 1 item @ $100 | Final: $100 + shipping |
| **Bulk discount threshold** | 2 items @ $100 | No bulk discount (requires 3+) |
| **Bulk discount applied** | 3 items @ $100 | 15% off total line: $255 |
| **Bulk exact threshold** | 3 items @ $100 | Exactly 15% off: $255 |
| **VIP customer** | tenureYears = 3 | VIP discount applied |
| **VIP threshold** | tenureYears = 2 | No VIP discount (strictly > 2) |
| **VIP + Bulk** | 3 items @ $100 + VIP | Bulk first, then VIP |
| **Safety valve hit** | Many discounts exceed 30% | Capped at exactly 30% |
| **Free shipping threshold** | $99.99 final | No free shipping |
| **Free shipping applies** | $100.01 final | Free standard/expedited |
| **Express shipping** | Any amount | Fixed $25, ignores free threshold |
| **Expedited with discount** | $100 original + Expedited | $7 + weight + $15 (15% of original) |

### Edge Cases

| Scenario | What to Handle |
|----------|----------------|
| Empty cart | Return zero totals, no error |
| Negative quantity | Validate/reject at boundary |
| Zero price item | Should calculate normally |
| Maximum integer values | No overflow in calculations |
| Fractional cents | Never occur - all integers |

---

## Test Specifications

### Unit Tests (Already Exists)
**Location:** `implementations/typescript-vitest/test/pricing.properties.test.ts`

**Coverage:**
- Property-based tests using `fast-check`
- All invariants verified across random inputs
- 100+ property tests covering edge cases

### API Integration Tests (Already Exists)
**Location:** `implementations/react-playwright/src/test/api/pricing-api.spec.ts`

| Test | Description | Metadata |
|------|-------------|----------|
| API returns correct calculation | POST /api/pricing/calculate matches PricingEngine | @critical, @compliance |
| Input validation - invalid SKU | Returns 400 with schema error | @validation |
| Input validation - negative quantity | Returns 400 with schema error | @validation |
| Input validation - empty cart | Returns valid zero result | @boundary |
| VIP logic verified via API | Customer with tenure > 2 gets VIP discount | @business-rule |
| Bulk discount verified via API | 3+ same SKU gets 15% discount | @business-rule |
| Discount cap enforced | Even with multiple discounts, never exceeds 30% | @safety |
| Shipping methods all work | Standard, Expedited, Express all return correct shipping | @comprehensive |
| Free shipping threshold | Orders > $100 get free standard/expedited shipping | @business-rule |

### E2E Tests (Already Exists)
**Location:** `implementations/react-playwright/src/test/e2e/checkout.ui.properties.test.ts`

**Coverage:**
- Grand total calculation in UI
- Express shipping fixed $25
- Free shipping badge display
- Shipping method selection

---

## Technical Implementation

### Where the Code Lives

| Component | Location | Status |
|-----------|----------|--------|
| Pricing Engine | `implementations/shared/src/pricing-engine.ts` | ✅ Complete |
| Types & Schemas | `implementations/shared/src/types.ts` | ✅ Complete |
| API Route | `implementations/react-playwright/src/server/routes/pricing.ts` | ✅ Exists, needs verification |
| Unit Tests | `implementations/typescript-vitest/test/pricing.properties.test.ts` | ✅ Complete |
| API Tests | `implementations/react-playwright/src/test/api/pricing-api.spec.ts` | ✅ Complete |

### API Endpoint

**Endpoint:** `POST /api/pricing/calculate`

**Request Body:**
```typescript
{
  items: Array<{
    sku: string;
    priceInCents: number;
    quantity: number;
    weightInKg: number;
  }>;
  user: {
    tenureYears: number;
  } | null;
  shippingMethod: 'STANDARD' | 'EXPEDITED' | 'EXPRESS';
}
```

**Response:**
```typescript
{
  originalTotal: number;
  finalTotal: number;
  grandTotal: number;
  totalDiscount: number;
  lineItems: LineItemResult[];
  shipping: ShipmentInfo;
}
```

### Critical Implementation Notes

1. **Integer Arithmetic:** All calculations in cents
2. **Discount Order:** Bulk → VIP → Safety Valve (not commutative)
3. **Shipping Timing:** Calculated AFTER product discounts
4. **Express Override:** Express delivery overrides all other shipping logic

---

## Completion Criteria

This domain is complete when:

- [x] All domain specs documented
- [x] API integration tests written and passing
- [x] API endpoint verified to use same PricingEngine as unit tests
- [x] Attestation reports show full coverage
- [x] All invariants verified across unit, API, and E2E layers

---

## References

- `docs/pricing-strategy.md` - Complete business rules
- `DEEP_DOMAIN_UNDERSTANDING.md` - Methodology
- `docs/TESTING_FRAMEWORK.md` - Testing standards
