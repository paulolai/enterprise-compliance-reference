# Feature: Dynamic Pricing Engine
#
# This Gherkin implementation demonstrates the "Translation Layer Tax":
# 1. Maintain separate feature files (English) and step definitions (TypeScript)
# 2. Regex patterns string-match between the two layers
# 3. Renaming concepts requires updating BOTH feature files AND regex patterns
# 4. No IDE support - rename doesn't work across the translation boundary
# 5. See step-definitions/pricing.steps.ts for examples of maintenance pain points
# 6. For comparison, see implementations/typescript-vitest/ for the Executable Specs approach
#
# NOTE: This is the ANTI-PATTERN we're demonstrating - hand-written examples that can never
# prove the same level of confidence as property-based tests with mathematical invariants.

Feature: Dynamic Pricing Engine
  As a customer
  I want accurate pricing with discounts
  So I can make informed purchasing decisions

  # ============================================
  # 1. Base Rules (Currency & Tax)
  # ============================================
  Scenario: Simple cart with no discounts
    Given I have a cart with items:
      | sku    | name      | price | qty | weight |
      | APPLE  | Apple     | 100   | 1    | 1.0    |
      | BANANA | Banana    | 200   | 1    | 1.0    |
    When I calculate the total
    Then the original total is 300 cents
    And the final total is 300 cents
    And the total discount is 0 cents

  Scenario: Single item with no discounts
    Given I have a cart with items:
      | sku   | name   | price | qty | weight |
      | ITEM  | Item   | 10000 | 1   | 2.0    |
    When I calculate the total
    Then the original total is 10000 cents
    And the final total is 10000 cents

  Scenario: Empty cart (edge case)
    Given I have an empty cart
    When I calculate the total
    Then the original total is 0 cents
    And the final total is 0 cents

  # ============================================
  # 2. Bulk Discounts
  # ============================================
  Scenario: Bulk discount for 3+ items of same SKU
    Given I have a cart with items:
      | sku   | name   | price | qty | weight |
      | IPAD  | iPad   | 1000  | 3    | 0.5    |
    When I calculate the total
    Then the bulk discount is 450 cents
    And the subtotal after bulk is 2550 cents
    And the final total is 2550 cents

  Scenario: No bulk discount for less than 3 items
    Given I have a cart with items:
      | sku   | name   | price | qty | weight |
      | IPAD  | iPad   | 1000  | 2    | 0.5    |
    When I calculate the total
    Then the bulk discount is 0 cents

  Scenario: Bulk discount applies to multiple items
    Given I have a cart with items:
      | sku      | name          | price | qty | weight |
      | SKU_A    | Product A     | 10000 | 3    | 1.0    |
      | SKU_B    | Product B     | 20000 | 5    | 2.0    |
    When I calculate the total
    Then the bulk discount is 19500 cents

  Scenario: Bulk discount only applied to qualifying items
    Given I have a cart with items:
      | sku     | name          | price | qty | weight |
      | BULK_1  | Bulk Item     | 10000 | 5    | 1.0    |
      | REGULAR | Regular Item  | 20000 | 2    | 1.0    |
    When I calculate the total
    Then the bulk discount is 7500 cents

  # ============================================
  # 3. VIP Tier
  # ============================================
  Scenario: VIP discount for tenure > 2 years
    Given I am a VIP customer with 3 years tenure
    And I have a cart with items:
      | sku     | name   | price | qty | weight |
      | WIDGET  | Widget | 10000 | 1   | 1.0    |
    When I calculate the total
    Then the VIP discount is 500 cents
    And the final total is 9500 cents

  Scenario: No VIP discount for tenure <= 2 years
    Given I am a customer with 1 year tenure
    And I have a cart with items:
      | sku     | name   | price | qty | weight |
      | WIDGET  | Widget | 10000 | 1   | 1.0    |
    When I calculate the total
    Then the VIP discount is 0 cents
    And the final total is 10000 cents

  Scenario: VIP discount calculated on post-bulk subtotal
    Given I am a VIP customer with 5 years tenure
    And I have a cart with items:
      | sku    | name  | price | qty | weight |
      | ITEM   | Item  | 10000 | 4   | 1.0    |
    When I calculate the total
    Then the original total is 40000 cents
    And the bulk discount is 6000 cents
    And the subtotal after bulk is 34000 cents
    And the VIP discount is 1700 cents

  # ============================================
  # 4. Safety Valve
  # ============================================
  Scenario: Safety valve does not trigger (discounts stay below 30%)
    Given I am a VIP customer with 5 years tenure
    And I have a cart with items:
      | sku   | name | price | qty | weight |
      | ITEM  | Item | 10000 | 10   | 1.0    |
    When I calculate the total
    Then the total discount is 19250 cents
    And the discount is not capped

  Scenario: Discount stacking without hitting cap
    Given I am a VIP customer with 3 years tenure
    And I have a cart with items:
      | sku      | name            | price | qty | weight |
      | PREMIUM  | Premium Laptop  | 100000| 3   | 5.0    |
    When I calculate the total
    Then the original total is 300000 cents
    And the bulk discount is 45000 cents
    And the VIP discount is 12750 cents
    And the total discount is 57750 cents
    And the discount is not capped

  # ============================================
  # 5. Shipping - Base & Weight
  # ============================================
  Scenario: Standard shipping with weight surcharge
    Given I have a cart with items:
      | sku      | name        | price | qty | weight |
      | HEAVY_01 | Heavy Item  | 10000 | 1   | 5.0    |
    And I select Standard shipping
    When I calculate the total including shipping
    Then the base shipping is 700 cents
    And the weight surcharge is 1000 cents
    And the total shipping cost is 1700 cents

  Scenario: Multiple items with accumulated weight
    Given I have a cart with items:
      | sku    | name   | price | qty | weight |
      | ITEM_1 | Item 1 | 5000  | 2   | 2.5    |
      | ITEM_2 | Item 2 | 5000  | 3   | 1.5    |
    And I select Standard shipping
    When I calculate the total including shipping
    Then shipping is free

  # ============================================
  # 6. Shipping - Free Threshold
  # ============================================
  Scenario: Free shipping for orders over $100
    Given I have a cart with items:
      | sku        | name          | price | qty | weight |
      | EXPENSIVE  | Expensive     | 10500 | 1   | 5.0    |
    And I select Standard shipping
    When I calculate the total including shipping
    Then shipping is free

  Scenario: Exactly $100 does not qualify for free shipping
    Given I have a cart with items:
      | sku     | name | price | qty | weight |
      | ITEM_100| Item | 10000 | 1   | 2.0    |
    And I select Standard shipping
    When I calculate the total including shipping
    Then shipping is not free

  Scenario: Discounted cart still over $100 gets free shipping
    Given I have a cart with items:
      | sku    | name   | price | qty | weight |
      | ITEM   | Item   | 15000 | 1   | 2.0    |
    And I am a VIP customer with 5 years tenure
    And I select Standard shipping
    When I calculate the total including shipping
    Then shipping is free

  # ============================================
  # 7. Shipping - Expedited
  # ============================================
  Scenario: Expedited shipping adds 15% surcharge
    Given I have a cart with items:
      | sku    | name  | price | qty | weight |
      | ITEM_1 | Item  | 5000  | 1   | 1.0    |
    And I select Expedited shipping
    When I calculate the total including shipping
    Then the expedited surcharge is 750 cents
    And the total shipping cost is 1650 cents

  Scenario: Expedited shipping qualifies for free shipping
    Given I have a cart with items:
      | sku   | name  | price | qty | weight |
      | ITEM  | Item  | 10000 | 3   | 1.0    |
    And I am a VIP customer with 5 years tenure
    And I select Expedited shipping
    When I calculate the total including shipping
    Then shipping is free

  # ============================================
  # 8. Shipping - Express
  # ============================================
  Scenario: Express delivery has fixed cost
    Given I have a cart with items:
      | sku    | name  | price | qty | weight |
      | HEAVY  | Heavy | 10000 | 5   | 10.0  |
    And I select Express shipping
    When I calculate the total including shipping
    Then the total shipping cost is exactly 2500 cents

  Scenario: Express delivery ignores weight
    Given I have a cart with items:
      | sku    | name   | price | qty | weight |
      | ULTRA  | Ultra  | 50000 | 1   | 50.0  |
    And I select Express shipping
    When I calculate the total including shipping
    Then the total shipping cost is exactly 2500 cents

  Scenario: Express delivery not eligible for free shipping
    Given I have a cart with items:
      | sku      | name         | price | qty | weight |
      | EXPENSIVE| Expensive    | 50000 | 1   | 10.0  |
    And I select Express shipping
    When I calculate the total including shipping
    Then the total shipping cost is exactly 2500 cents
    And shipping is not free

  # ============================================
  # 9. Combined Scenarios
  # ============================================
  Scenario: Bulk + VIP applied correctly
    Given I am a VIP customer with 3 years tenure
    And I have a cart with items:
      | sku         | name        | price | qty | weight |
      | PREMIUM_ITEM| Premium     | 100000| 5   | 2.0    |
    When I calculate the total
    Then the original total is 500000 cents
    And the bulk discount is 75000 cents
    And the VIP discount is 21250 cents
    And the final total is 403750 cents

  Scenario: Empty cart with VIP user
    Given I am a VIP customer with 5 years tenure
    And I have an empty cart
    When I calculate the total
    Then the original total is 0 cents
    And the final total is 0 cents

  Scenario: Tenure exactly 2 years is not VIP
    Given I am a customer with 2 years tenure
    And I have a cart with items:
      | sku   | name   | price | qty | weight |
      | ITEM  | Item   | 5000  | 3   | 1.0    |
    When I calculate the total
    Then the VIP discount is 0 cents
    And the bulk discount is 2250 cents

  # ============================================
  # 10. Grand Total Calculations
  # ============================================
  Scenario: Grand total includes shipping
    Given I have a cart with items:
      | sku   | name  | price | qty | weight |
      | ITEM  | Item  | 5000  | 1   | 1.0    |
    And I select Standard shipping
    When I calculate the total including shipping
    Then the grand total equals final total plus shipping

  Scenario: Grand total with zero shipping (free)
    Given I have a cart with items:
      | sku    | name   | price | qty | weight |
      | ITEM   | Item   | 11000 | 1   | 2.0    |
    And I select Standard shipping
    When I calculate the total including shipping
    Then the grand total equals the final total
