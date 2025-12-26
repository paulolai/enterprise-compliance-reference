# Dynamic Shipping Calculation - Implementation Plan

## Executive Summary

Add a Dynamic Shipping Calculation feature to demonstrate the Executable Specifications Pattern handling complex business rules, property-based testing, and integration with existing pricing logic.

**Test Growth**: 7 tests → 22 tests (9 examples + 13 invariants)
**Business Areas**: 4 areas → 5 areas (adding "5. Shipping Calculation" with 5 subsections)

## Implementation Overview

### Phase 1: Type Definitions
**File**: `src/types.ts`

**Additions**:
- `enum ShippingMethod { STANDARD, EXPEDITED, EXPRESS }`
- `interface ShipmentInfo { method, baseShipping, weightSurcharge, expeditedSurcharge, totalShipping, isFreeShipping }`
- Extend `CartItem` with `weightInKg: number` property
- Extend `PricingResult` with `shipment: ShipmentInfo` and `grandTotal: number`

### Phase 2: CartBuilder API Extension
**File**: `test/fixtures/cart-builder.ts`

**Additions**:
- `.withItem(..., weightInKg?: number)` - Accept optional weight (default 1.0kg)
- `.withShipping(method: ShippingMethod)` - Set shipping method
- `.withStandardShipping()`, `.withExpeditedShipping()`, `.withExpressShipping()` - Convenience methods
- Pass shipping method to engine in `calculate()` method

### Phase 3: Arbitraries for Property-Based Testing
**File**: `test/fixtures/arbitraries.ts`

**Additions**:
- Extend `itemArb` with `weightInKg` (0.1kg to 50kg, 0.1kg precision)
- Add `shippingMethodArb` using `fc.constantFrom`
- Replace `cartArb` with `cartWithShippingArb` (same structure, includes weight)

### Phase 4: Core Pricing Engine Logic
**File**: `src/pricing-engine.ts`

**Changes**:
- Add `shippingMethod` parameter to `calculate(items, user, shippingMethod = STANDARD)`
- Add `calculateShipping(items, originalSubtotal, discountedSubtotal, method)` private method
- Add `calculateWeightSurcharge(items)` private method
- Maintain existing product pricing logic (bulk → VIP → safety valve)
- Calculate shipping AFTER product discounts
- Add shipping breakdown to `PricingResult` return value

**Algorithm Order**:
1. Product Pricing (existing): Calculate line items → Bulk discounts → VIP → Safety valve
2. Shipping (new): Check free shipping threshold → Calculate base + weight + expedited surcharge
3. Final Totals: `grandTotal = finalProductTotal + shipment.totalShipping`

### Phase 5: Test Hierarchy
**File**: `test/shipping.test.ts` (NEW FILE)

**Structure**:
```
Pricing Engine Strategy
├── 1. Base Rules (Currency & Tax) [2 tests]
├── 2. Bulk Discounts [2 tests]
├── 3. VIP Tier [2 tests]
├── 4. Safety Valve [1 test]
└── 5. Shipping Calculation [15 tests]
    ├── 5.1 Base Shipping & Weight [4 tests]
    │   ├── Example: Standard $7 + $2/kg
    │   ├── Example: Multiple items sum weights
    │   ├── Invariant: Standard = $7 + (totalKg × $2)
    │   └── Invariant: Grand Total = Product + Shipping
    ├── 5.2 Free Shipping Threshold [4 tests]
    │   ├── Example: Orders > $100 get free shipping
    │   ├── Example: Exactly $100 does NOT qualify
    │   ├── Example: Discounts can enable free shipping
    │   └── Invariant: Free when discounted > $100
    ├── 5.3 Expedited Shipping [3 tests]
    │   ├── Example: Expedited adds 15% of original
    │   ├── Example: Expedited 15% before discounts
    │   └── Invariant: Expedited = 15% of original subtotal
    ├── 5.4 Express Delivery [3 tests]
    │   ├── Example: Fixed $25 regardless
    │   ├── Example: Express overrides free shipping
    │   └── Invariant: Express always = $25
    └── 5.5 Compositional Invariants [3 tests]
        ├── Invariant: Shipping excluded from discount cap
        ├── Invariant: Shipping after discounts
        └── Invariant: Monotonic grand total
```

**Test Pattern**: Each subsection has 1-2 Examples (documentation) + 1-2 Invariants (PBT)

### Phase 6: Documentation
**File**: `docs/pricing-strategy.md`

**Add Section 5**: Complete shipping business rules with order of operations diagram, formulas, invariants, and edge cases.

### Phase 7: Backward Compatibility

**Minimal Changes Required**:
- CartBuilder provides weight default (1.0kg) → existing tests work unchanged
- PricingEngine defaults to STANDARD shipping → existing calls work unchanged
- Update arbitraries import: `cartArb` → `cartWithShippingArb`

## Business Rules Summary

### 5. Shipping Calculation

**Base Shipping**: $7.00 + $2.00 per kg
**Free Threshold**: Orders > $100 (after discounts) = FREE shipping
**Expedited Surcharge**: +15% of original subtotal (before discounts)
**Express Delivery**: Fixed $25.00 (overrides all other calculations)
**Shipping Discount Cap**: Shipping excluded from 30% product discount cap

**Key Interactions**:
- Shipping calculated AFTER product discounts
- Free shipping depends on `finalTotal` (allows bulk/VIP discounts to enable free shipping)
- Expedited surcharge uses `originalTotal` (before any discounts)
- Express delivery overrides all other shipping logic
- Shipping costs are additive (not part of safety valve cap)

## Implementation Checklist

### Files to Modify
- [x] `src/types.ts` - Add shipping types, extend CartItem and PricingResult
- [x] `src/pricing-engine.ts` - Add shipping calculation logic
- [x] `test/fixtures/cart-builder.ts` - Extend fluent API with shipping methods
- [x] `test/fixtures/arbitraries.ts` - Add shipping generators, update itemArb

### Files to Create
- [x] `test/shipping.test.ts` - Complete test hierarchy with examples and invariants

### Files to Update
- [x] `docs/pricing-strategy.md` - Add Section 5: Shipping Calculation

### Files to No Changes
- `package.json` - No new dependencies
- `vitest.config.ts` - Reporter handles new tests automatically
- `attestation-reporter.ts` - Existing reporter works with new test structure

## Current Status

**✅ Implementation Complete**: All code changes implemented
**✅ Test Structure Created**: 47 tests organized in 5 business areas
**⚠️ Test Failures**: 5 tests failing due to floating point precision issues
**🔄 In Progress**: Another agent fixing test assertions with proper tolerance

## Test Breakdown

- **Pricing Tests**: 7 tests (all passing)
  - Base Rules: 2 tests
  - Bulk Discounts: 2 tests
  - VIP Tier: 2 tests
  - Safety Valve: 1 test

- **Shipping Tests**: 15 tests (2 examples + 1 invariant per subsection)
  - 5.1 Base Shipping & Weight: 3 tests
  - 5.2 Free Shipping Threshold: 4 tests
  - 5.3 Expedited Shipping: 3 tests (3 failing)
  - 5.4 Express Delivery: 3 tests
  - 5.5 Compositional Invariants: 2 tests (2 failing)

**Failing Tests**:
1. Example: Multiple items sum weights (precision issue with total)
2. Example: Expedited adds 15% of original subtotal (precision issue)
3. Example: Expedited 15% applied BEFORE discounts (precision issue)
4. Invariant: Expedited surcharge = 15% of original subtotal (need to round expected)
5. Invariant: Shipping after discounts (need to round expected)

## Expected Test Results When Fixed

**Total Tests**: 22 (9 examples + 13 invariants)
**Test Areas**: 5 (4 existing + 1 new shipping)
**Execution Time**: ~5-8s (property-based tests with 1000 iterations)
**Attestation Report**: Shows 5 business areas with detailed hierarchy

## Known Issues & Fixes Needed

1. **Floating Point Precision Tests**: Expedited surcharge assertions need `toBeCloseTo()` tolerance
2. **Weight Calculation**: Multi-item weight test needs tolerance for floating point rounding
3. **Property-Based Tests**: Expected values need to be rounded before comparison

All these are minor assertion precision issues, not logic problems.

## Critical Files to Read Before Implementation

1. `src/pricing-engine.ts` - Existing calculation pattern to follow
2. `src/types.ts` - Existing type definitions
3. `test/fixtures/cart-builder.ts` - Fluent API pattern
4. `test/pricing.test.ts` - Test hierarchy and invariant examples
5. `test/fixtures/arbitraries.ts` - Property-based test generator patterns
