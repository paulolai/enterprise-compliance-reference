# Plan: Implement Cents-Based Pricing System

## Decision ✅
**Approved**: Convert entire pricing system to integer cents to eliminate floating-point precision issues.

## Rationale
The floating-point precision errors (`0.020000000000003126` instead of exactly `0.02`) are a classic currency anti-pattern. Converting to cents will:
- Provide exact arithmetic operations
- Eliminate all rounding errors
- Make invariant tests pass with exact equality
- Follow financial industry best practices

## Implementation Steps

### Step 1: Update types.ts
- Add `type Cents = number;` and `type Dollars = number;`
- Update all monetary fields to use Cents
- Add conversion utilities: `toDollars()`, `toCents()`, `formatCurrency()`

### Step 2: Update pricing-engine.ts
- Convert percentages to integer arithmetic
- Remove `round()` private method (not needed with integers)

### Step 3: Update cart-builder.ts
- Update `withItem()` to accept cents directly

### Step 4: Update arbitraries.ts
- Change price generator to integers

### Step 5: Update test files
- Convert all dollar values to cents (multiply by 100)
- Use exact equality assertions

## Success Metrics
- ✅ All 47 tests pass with exact equality assertions
- ✅ Zero floating-point precision warnings
- ✅ Attestation report shows 100% pass rate

## Status: Ready to Implement

