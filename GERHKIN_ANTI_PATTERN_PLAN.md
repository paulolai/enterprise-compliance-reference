# Implementation Plan: Gherkin Anti-Pattern Example

## Goal
Create a runnable, realistic Gherkin-based implementation of the same pricing engine to serve as a direct comparison to the Executable Specifications pattern. This will demonstrate the "Translation Layer Tax" and maintenance burden in a concrete, executable way.

## Approach: Pure Gherkin (Example-Based Testing)
Choosing realistic hand-written scenarios that teams actually use in practice, not attempting PBT integration with Gherkin (which defeats both purposes).

## Directory Structure

```
implementations/
├── typescript-vitest/           # Existing: Executable Specs
└── typescript-cucumber/         # NEW: Gherkin Anti-Pattern
    ├── features/
    │   └── pricing.feature      # Gherkin feature files
    ├── step-definitions/
    │   └── pricing.steps.ts     # Step definitions with regex
    ├── src/
    │   └── pricing-engine.ts    # Shared pricing logic (reuse or duplicate)
    └── package.json             # Cucumber setup
```

## Implementation Steps

### 1. Setup typescript-cucumber directory
- Initialize new TypeScript project with Cucumber
- Install dependencies: `@cucumber/cucumber`, `@cucumber/pretty-formatter`, chai
- Configure cucumber config

### 2. Create Gherkin Feature Files (features/pricing.feature)
Implement scenarios covering the same business rules from `docs/pricing-strategy.md`:

```gherkin
Feature: Dynamic Pricing Engine
  As a customer
  I want accurate pricing with discounts
  So I can make informed purchasing decisions

  # Base Rules
  Scenario: Simple cart with no discounts
    Given I have a cart with items:
      | sku    | name      | price | qty |
      | APPLE  | Apple     | 100   | 1    |
      | BANANA | Banana    | 200   | 1    |
    When I calculate the total
    Then the original total is 300 cents
    And the final total is 300 cents
    And the total discount is 0 cents

  # Bulk Discounts
  Scenario: Bulk discount for 3+ items of same SKU
    Given I have a cart with items:
      | sku   | name   | price | qty |
      | IPAD  | iPad   | 1000  | 3    |
    When I calculate the total
    Then the bulk discount is 450 cents
    And the subtotal after bulk is 2550 cents

  Scenario: No bulk discount for less than 3 items
    Given I have a cart with items:
      | sku   | name   | price | qty |
      | IPAD  | iPad   | 1000  | 2    |
    When I calculate the total
    Then the bulk discount is 0 cents

  # VIP Tier
  Scenario: VIP discount for tenure > 2 years
    Given I am a VIP customer with 3 years tenure
    And I have a cart with items:
      | sku     | name   | price | qty |
      | WIDGET  | Widget | 10000 | 1    |
    When I calculate the total
    Then the VIP discount is 500 cents
    And the final total is 9500 cents

  Scenario: No VIP discount for tenure <= 2 years
    Given I am a customer with 1 year tenure
    And I have a cart with items:
      | sku     | name   | price | qty |
      | WIDGET  | Widget | 10000 | 1    |
    When I calculate the total
    Then the VIP discount is 0 cents

  # Safety Valve
  Scenario: Safety valve caps discount at 30%
    Given I am a VIP customer with 5 years tenure
    And I have a cart with items:
      | sku   | name | price | qty |
      | ITEM  | Item | 10000 | 10   |
    When I calculate the total
    Then the total discount is capped at 30% of original
    And the discounted total is 70% of original

  # Shipping - Base & Weight
  Scenario: Standard shipping with weight surcharge
    Given I have a cart with items:
      | sku      | name        | price | qty | weight |
      | HEAVY_01 | Heavy Item  | 10000 | 1   | 5.0    |
    And I select Standard shipping
    When I calculate the total including shipping
    Then the base shipping is 700 cents
    And the weight surcharge is 1000 cents
    And the total shipping cost is 1700 cents

  # Shipping - Free Threshold
  Scenario: Free shipping for orders over $100
    Given I have a cart with items:
      | sku        | name          | price | qty |
      | EXPENSIVE  | Expensive     | 10500 | 1   |
    And I select Standard shipping
    When I calculate the total including shipping
    Then shipping is free

  # Shipping - Expedited
  Scenario: Expedited shipping adds 15% surcharge
    Given I have a cart with items:
      | sku    | name  | price | qty |
      | ITEM_1 | Item  | 5000  | 1   |
    And I select Expedited shipping
    When I calculate the total including shipping
    Then the expedited surcharge is 750 cents
    And the total shipping includes base + expedited

  # Shipping - Express
  Scenario: Express delivery has fixed cost
    Given I have a cart with items:
      | sku    | name  | price | qty | weight |
      | HEAVY  | Heavy | 10000 | 5   | 10.0  |
    And I select Express shipping
    When I calculate the total including shipping
    Then the total shipping cost is exactly 2500 cents
```

**Note**: Will need approximately 20-25 scenarios to provide comparable coverage.

### 3. Create Step Definitions (step-definitions/pricing.steps.ts)

Implement classic regex-based step definitions showing the translation layer:

```typescript
import { Given, When, Then } from '@cucumber/cucumber'
import { expect } from '@cucumber/cucumber/lib/assert'
import { PricingEngine } from '../src/pricing-engine'
import type { CartItem, User, ShippingMethod } from '../src/types'

// World object for sharing state between steps
class PricingWorld {
  cartItems: CartItem[] = []
  user: User = { tenureYears: 0 }
  shippingMethod: ShippingMethod = 'STANDARD'
  result: any = null
}

// Set up world
let world = new PricingWorld()

// Step definitions with regex
Given(/^I have a cart with items:$/, function(dataTable) {
  const items = dataTable.hashes()
  world.cartItems = items.map(item => ({
    sku: item.sku,
    name: item.name,
    price: parseInt(item.price),
    quantity: parseInt(item.qty),
    weightInKg: parseFloat(item.weight || '1.0')
  }))
})

Given(/^I am a VIP customer with (\d+) years tenure$/, function(years) {
  world.user = { tenureYears: parseInt(years) }
})

Given(/^I select (\w+) shipping$/, function(method) {
  world.shippingMethod = method === 'Standard' ? 'STANDARD' :
                       method === 'Expedited' ? 'EXPEDITED' : 'EXPRESS'
})

When(/^I calculate the total$/, function() {
  world.result = PricingEngine.calculate(world.cartItems, world.user)
})

When(/^I calculate the total including shipping$/, function() {
  world.result = PricingEngine.calculate(world.cartItems, world.user, world.shippingMethod)
})

Then(/^the original total is (\d+) cents$/, function(expected) {
  expect(world.result.originalTotal).toBe(parseInt(expected))
})

Then(/^the bulk discount is (\d+) cents$/, function(expected) {
  expect(world.result.bulkDiscountTotal).toBe(parseInt(expected))
})

Then(/^the VIP discount is (\d+) cents$/, function(expected) {
  expect(world.result.vipDiscount).toBe(parseInt(expected))
})

Then(/^the final total is (\d+) cents$/, function(expected) {
  expect(world.result.finalTotal).toBe(parseInt(expected))
})

Then(/^shipping is free$/, function() {
  expect(world.result.shipment.isFreeShipping).toBe(true)
  expect(world.result.shipment.totalShipping).toBe(0)
})

// ... more step definitions for each scenario
```

### 4. Implement or Reuse Pricing Engine
Two options:
- **Option A**: Duplicate the pricing engine code in the cucumber implementation
- **Option B**: Share the `src/pricing-engine.ts` and `src/types.ts` via symlink or git subtree

**Recommendation**: Duplicate the engine to keep each implementation self-contained for clarity. This makes the comparison more honest (two separate ways to test the same business logic).

### 5. Create Comparison Documentation

Create `docs/GERHKIN_VS_EXECUTABLE.md` showing:

**Code Metrics Comparison**:
```
| Metric                    | Gherkin Anti-Pattern | Executable Specs |
|---------------------------|---------------------|------------------|
| Test Files                | 2 (1 feature + 1 steps) | 2 (pricing + shipping) |
| Lines of Test Code        | ~350 (25 scenarios) | ~450 (47 tests) |
| Code/Scenarios Covered    | 25 hand-written      | 47 + 1000s PBT runs |
| Type Safety               | Regex string matching | Full TypeScript types |
| Refactoring "Bulk Rename" | Manual search across feature + steps | IDE F2 refactor |
| Test Execution            | ~2-3s                | ~0.7s            |
```

**Maintenance Scenario Example**:
"I need to rename `totalDiscount` to `finalDiscount` throughout the codebase"
- Gherkin: Update pricing.feature (5 uses) + pricing.steps.ts (8 regex patterns) + engine code
- Executable: IDE F2 rename - updates everything automatically in 1 second

**Debugging Scenario**:
"A test is failing, showing unexpected discount calculation"
- Gherkin: Set breakpoint in engine, lose context in step definitions, no variable inspection in Gherkin layer
- Executable: Set breakpoint directly, full IDE support, type hover works

### 6. Configure Cucumber Report Generation

Add report generation in `cucumber.config.ts`:

```typescript
import { defineConfig } from '@cucumber/cucumber'
import { JsonFormatter } from '@cucumber/cucumber/lib/formatter'
import * as fs from 'fs'

export default defineConfig({
  formatOptions: { snippetInterface: 'async-await' },
  formats: [
    ['pretty', {}],  // Console output
    ['json:cucumber-report.json', {}],  // Machine-readable report
  ],
  publishQuiet: true
})
```

Add npm script to generate HTML report:
```json
{
  "scripts": {
    "test": "cucumber-js",
    "report": "cucumber-js --format html:cucumber-report.html"
  }
}
```

### 7. Add Educational Comments in Gherkin Code

Highlight pain points with inline comments:

**In step definitions**:
```typescript
// WARNING: If you rename 'bulk discount' in the feature file,
// you must update this regex pattern manually or tests will fail!
Given(/^I have a (\d+)% bulk discount/, function(percentage) {
  // ...
})

// PAIN POINT: This regex matches 3 different places in feature files.
// A rename operation requires manual updates across all of them.
Then(/^the (bulk discount|VIP discount|total discount) is (\d+) cents/, function(type, amount) {
  // ...
})
```

**Comparison note in pricing.feature**:
```gherkin
# Feature: Dynamic Pricing Engine
#
# NOTE: This Gherkin implementation demonstrates the "Translation Layer Tax":
# 1. Maintain separate feature files (English) and step definitions (TypeScript)
# 2. Regex patterns string-match between the two layers
# 3. Renaming concepts requires updating BOTH feature files AND regex patterns
# 4. No IDE support - rename doesn't work across the translation boundary
# 5. See step-definitions/pricing.steps.ts for examples of maintenance pain points
```

### 8. Update Root README.md

Add section comparing both implementations:

```markdown
## Compare the Approaches

This repository demonstrates two ways to test the same business rules:

### Executable Specifications (`implementations/typescript-vitest/`)
✅ Property-based testing with mathematical invariants
✅ Fluent builder API for readable tests
✅ Full type safety and IDE support
✅ 47 tests + 1000s of random input combinations
✅ Rich attestation reports with deep observability
✅ ~0.7s execution time
✅ Instant refactoring with IDE

### The Anti-Pattern (`implementations/typescript-cucumber/`)
❌ Hand-written Gherkin scenarios
❌ Regex-based step definitions (the "Translation Layer")
❌ Manual maintenance burden
❌ 25 scenarios only (what you thought to write)
❌ Basic Cucumber reports
❌ ~2-3s execution time
❌ Refactoring requires manual updates across feature + step files

**See detailed comparison in:** [`docs/GERHKIN_VS_EXECUTABLE.md`](docs/GERHKIN_VS_EXECUTABLE.md)
```

## Critical Files to Create/Read

**New Files**:
1. `implementations/typescript-cucumber/package.json`
2. `implementations/typescript-cucumber/features/pricing.feature`
3. `implementations/typescript-cucumber/step-definitions/pricing.steps.ts`
4. `implementations/typescript-cucumber/src/pricing-engine.ts` (duplicate)
5. `implementations/typescript-cucumber/src/types.ts` (duplicate)
6. `implementations/typescript-cucumber/cucumber.config.ts`
7. `implementations/typescript-cucumber/tsconfig.json`
8. `docs/GERHKIN_VS_EXECUTABLE.md`

**Files to Read for Context**:
- `docs/pricing-strategy.md` - Business rules to implement
- `implementations/typescript-vitest/src/pricing-engine.ts` - Engine logic to duplicate
- `implementations/typescript-vitest/src/types.ts` - Type definitions
- `implementations/typescript-vitest/test/pricing.test.ts` - Test coverage to match approximately

## Success Criteria

- ✅ Cucumber implementation runs with `npm test`
- ✅ All 25+ Gherkin scenarios pass
- ✅ Clear demonstration of regex-based step definitions
- ✅ Comparison doc shows the "translation tax"
- ✅ Blog post can reference both implementations
- ✅ Users can run both approaches side-by-side and see the difference
- ✅ Both implementations generate reports for fair comparison
- ✅ Pain points are highlighted with educational comments in Gherkin code
