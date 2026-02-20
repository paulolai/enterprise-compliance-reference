# Pricing Strategy

This document represents the single source of truth for the Dynamic Pricing Engine.
All implementations must strictly adhere to these rules.

## 1. Base Rules (Currency & Tax)
- **Currency:** All monetary values are in **AUD**.
- **Internal Representation:** All calculations use integer **cents** (e.g., $1.00 = 100) to eliminate floating-point precision issues.
- **GST:** A 10% Goods and Services Tax is **included** in the base shelf price of every item.
- **Precision:** Final values are exact integer cents.
- **Invariant:** `Final Total` <= `Original Total` (Prices never increase).

**See:**
- Unit tests: `packages/domain/test/pricing.properties.test.ts:7-15`
- Integration tests: `packages/domain/test/integration.properties.test.ts:238-276`

## 2. Bulk Discounts
**Goal:** Encourage larger basket sizes.
- **Rule:** If a customer buys **3 or more** of the *same* SKU (Stock Keeping Unit), that specific line item is discounted by **15%**.
- **Invariant:** Any line item with Quantity >= 3 MUST have a 15% discount applied.

**See:**
- Property tests: `packages/domain/test/pricing.properties.test.ts:17-30`

## 3. VIP Tier
**Goal:** Reward long-term loyalty.
- **Eligibility:** Users with a tenure of **more than 2 years**.
- **Rule:** VIPs receive a flat **5% discount** on the *cart subtotal*.
- **Ordering:** This discount is applied **after** any Bulk Discounts have been calculated.
- **Invariant:** If User Tenure > 2, a 5% discount is applied to the post-bulk subtotal.

**See:**
- Property tests: `packages/domain/test/pricing.properties.test.ts:32-41`
- Integration tests: `packages/domain/test/integration.properties.test.ts:10-56`

## 4. Safety Valve
**Goal:** Prevent stacking discounts from eroding all margin.
- **Rule:** The **total discount amount** (Bulk + VIP) must strictly **never exceed 30%** of the original cart value (Sum of base prices).
- **Enforcement:** If the calculated discount exceeds 30%, the discount is capped at exactly 30% of the total original value.
- **Invariant:** `Total Discount` <= 30% of `Original Total`.

**See:**
- Property tests: `packages/domain/test/pricing.properties.test.ts:43-55`
- Integration tests: `packages/domain/test/integration.properties.test.ts:10-56`

## 5. Shipping Calculation
**Order of Operations:** Shipping is calculated **after** all product discounts are applied.

### 5.1 Base Shipping & Weight
**Goal:** Charge shipping based on cart weight.
- **Base Rate:** Flat **$7.00** for standard delivery.
- **Weight Surcharge:** +**$2.00** per kilogram of total cart weight.
- **Calculation:** Total Weight = Σ(item.weightInKg × item.quantity)
- **Invariant:** Standard Shipping = $7.00 + (Total Weight × $2.00)
- **Example:** 1 item @ 5kg = $7 + (5 × $2) = $17.00 shipping

**See:** `packages/domain/test/shipping.properties.test.ts:7-23`

### 5.2 Free Shipping Threshold
**Goal:** Encourage larger orders by offering free shipping.
- **Condition:** Orders greater than **$100.00** (after ALL discounts) qualify for free shipping.
- **Threshold Check:** Based on `finalTotal` (post-bulk, post-VIP, post-safety valve).
- **Interaction:** Product discounts can enable free shipping (e.g., $150 original → $85 discounted → NO free shipping).
- **Edge Case:** Exactly **$100.00** does NOT qualify.
- **Invariant:** If `finalTotal > 100.00`, then `totalShipping = 0`

**See:** `packages/domain/test/shipping.properties.test.ts:25-35`

### 5.3 Expedited Shipping
**Goal:** Charge premium for faster delivery.
- **Surcharge:** +**15%** of original subtotal ( BEFORE any discounts).
- **Additive:** Expedited surcharge is added to base shipping + weight.
- **Calculation:** Expedited Surcharge = `originalTotal × 0.15`
- **Total Shipping:** Base + Weight + Expedited Surcharge
- **Example:** $100 original → $15 expedited surcharge (even with 15% bulk discount making it $85).
- **Invariant:** Expedited Surcharge = 15% of `originalTotal`

**See:** `packages/domain/test/shipping.properties.test.ts` (covered in integration tests)

### 5.4 Express Delivery
**Goal:** Fixed-price premium delivery option.
- **Fixed Fee:** **$25.00** regardless of weight, cart value, or discounts.
- **Override:** Express delivery overrides all other shipping calculations.
- **Interaction:** NOT eligible for free shipping threshold.
- **Invariant:** Express Delivery always costs exactly $25.00

**See:** `packages/domain/test/shipping.properties.test.ts:37-47`

### 5.5 Shipping Discount Cap
**Goal:** Ensure shipping costs don't erode product discount protection.
- **Exclusion:** Shipping costs do **NOT** count toward the 30% product discount cap.
- **Enforcement:** Safety valve applies only to product discounts (bulk + VIP), not shipping.
- **Additive:** Shipping costs are added to `finalTotal` to produce `grandTotal`.
- **Invariant:** `grandTotal = finalTotal + totalShipping`
- **Invariant:** `totalDiscount` (product only) ≤ 30% of `originalTotal`

**See:** `packages/domain/test/shipping.properties.test.ts:49-59`

### 5.6 Integration with Pricing Engine
```
Inputs: CartItem[] (with weightInKg), User, ShippingMethod
  ↓
[Product Pricing Chain]
  ├─ Bulk Discounts (15% for qty ≥ 3)
  ├─ VIP Discount (5% if tenure > 2)
  └─ Safety Valve (max 30% product discount)
  ↓
Result: finalProductTotal
  ↓
[Shipping Calculation Chain]
  ├─ Check free shipping: finalProductTotal > $100?
  ├─ Calculate base: $7.00 (unless Express)
  ├─ Calculate weight: totalKg × $2.00 (unless Express)
  ├─ Calculate expedited: originalTotal × 15% (if Expedited)
  └─ Apply Express override: $25.00 (if Express)
  ↓
Result: ShipmentInfo
  ↓
[Final Totals]
  └─ grandTotal = finalProductTotal + shipment.totalShipping
```

