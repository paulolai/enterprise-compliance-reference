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
  # PAIN POINT: Even simple calculations need manual verification in examples.
  #            Every row in this table requires mental math (or a calculator).
  #            What if the business rule changes from AUD to USD? Update all expected values manually!
  Scenario Outline: Simple cart calculations
    Given I have a cart with items:
      | sku     | name   | price | qty | weight |
      | ITEM    | Item   | <price>| <qty>| 1.0    |
    When I calculate the total
    Then the original total is <original> cents
    And the final total is <original> cents

    # PAIN POINT: Manual calculation for each row: price * qty
    #            100 * 1 = 100
    #            100 * 2 = 200
    #            These are TRIVIAL cases yet require manual verification.
    #            NOTICE: We can't test qty>=3 here because bulk discounts apply!
    #              Executable Specs handles this automatically. Gherkin requires
    #              separate scenarios or complex expected value calculations.
    Examples:
      | price | qty | original |
      | 100   | 1   | 100      |
      | 500   | 1   | 500      |
      | 1000  | 1   | 1000     |
      | 100   | 2   | 200      |
      | 1000  | 2   | 2000     |
      | 5000  | 2   | 10000    |
      | 15000 | 1   | 15000    |
      | 12345 | 1   | 12345    |

  Scenario: Simple cart with multiple items no discounts
    Given I have a cart with items:
      | sku    | name      | price | qty | weight |
      | APPLE  | Apple     | 100   | 1    | 1.0    |
      | BANANA | Banana    | 200   | 1    | 1.0    |
    When I calculate the total
    Then the original total is 300 cents
    And the final total is 300 cents
    And the total discount is 0 cents


  Scenario: Empty cart (edge case)
    Given I have an empty cart
    When I calculate the total
    Then the original total is 0 cents
    And the final total is 0 cents

  # ============================================
  # 2. Bulk Discounts
  # ============================================
  # PAIN POINT: Scenario Outline with Examples table - still HAND-PICKED cases!
  #            Look at how we have to MANUALLY calculate each expected value.
  #            Compare to property-based invariant: ONE test proves rule for ALL quantities.
  Scenario Outline: Bulk discount for different quantities
    Given I have a cart with items:
      | sku   | name   | price | qty | weight |
      | IPAD  | iPad   | 1000  | <qty>| 0.5    |
    When I calculate the total
    Then the volume discount is <bulk_discount> cents
    And the final total is <final_total> cents

    # PAIN POINT: Manual calculation required for each example row:
    #            Qty=3: bulk=1000*3*0.15=450, final=3000-450=2550
    #            Qty=4: bulk=1000*4*0.15=600, final=4000-600=3400
    #            Qty=5: bulk=1000*5*0.15=750, final=5000-750=4250
    #            Qty=10: bulk=1000*10*0.15=1500, final=10000-1500=8500
    #            Qty=100: bulk=1000*100*0.15=15000, final=100000-15000=85000
    #            ONE TYPING ERROR in this table and your test silently passes with wrong logic!
    Examples:
      | qty | bulk_discount | final_total |
      | 1   | 0             | 1000        |
      | 2   | 0             | 2000        |
      | 3   | 450           | 2550        |
      | 4   | 600           | 3400        |
      | 5   | 750           | 4250        |
      | 10  | 1500          | 8500        |
      | 25  | 3750          | 21250       |
      | 50  | 7500          | 42500       |
      | 100 | 15000         | 85000       |

  Scenario: Bulk discount applies to multiple items
    Given I have a cart with items:
      | sku      | name          | price | qty | weight |
      | SKU_A    | Product A     | 10000 | 3    | 1.0    |
      | SKU_B    | Product B     | 20000 | 5    | 2.0    |
    When I calculate the total
    Then the volume discount is 19500 cents

  Scenario: Bulk discount only applied to qualifying items
    Given I have a cart with items:
      | sku     | name          | price | qty | weight |
      | BULK_1  | Bulk Item     | 10000 | 5    | 1.0    |
      | REGULAR | Regular Item  | 20000 | 2    | 1.0    |
    When I calculate the total
    Then the volume discount is 7500 cents

  # ============================================
  # 3. VIP Tier
  # ============================================
  # PAIN POINT: Testing boundary conditions requires HAND-WRITING each case.
  #            Look at tenure=2.0 vs 2.1 to prove the > 2.0 rule.
  #            In property-based testing, we test ALL values in [0, 10] automatically.
  Scenario Outline: VIP discount based on tenure
    Given I am a VIP customer with <tenure> years tenure
    And I have a cart with items:
      | sku     | name   | price | qty | weight |
      | WIDGET  | Widget | 10000 | 1   | 1.0    |
    When I calculate the total
    Then the VIP discount is <vip_discount> cents
    And the final total is <final_total> cents

    # PAIN POINT: Manually verified boundary conditions around the 2.0 year threshold
    #            Tenure=0,1,2 → No discount (not VIP)
    #            Tenure=2.1,3,5,10 → 5% discount
    #            What about tenure=2.0000001? 2.5? 9.99?
    #            You'd need infinite examples to prove this mathematically!
    Examples:
      | tenure | vip_discount | final_total |
      | 0      | 0             | 10000       |
      | 1      | 0             | 10000       |
      | 1.5    | 0             | 10000       |
      | 2      | 0             | 10000       |
      | 2.1    | 500           | 9500        |
      | 2.5    | 500           | 9500        |
      | 3      | 500           | 9500        |
      | 5      | 500           | 9500        |
      | 10     | 500           | 9500        |
      | 15     | 500           | 9500        |


  Scenario: VIP discount calculated on post-bulk subtotal
    Given I am a VIP customer with 5 years tenure
    And I have a cart with items:
      | sku    | name  | price | qty | weight |
      | ITEM   | Item  | 10000 | 4   | 1.0    |
    When I calculate the total
    Then the original total is 40000 cents
    And the volume discount is 6000 cents
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
    And the volume discount is 45000 cents
    And the VIP discount is 12750 cents
    And the total discount is 57750 cents
    And the discount is not capped

  # ============================================
  # 5. Shipping - Base & Weight
  # ============================================
  # PAIN POINT: Shipping calculations require multiple intermediate values.
  #            base=700, weight_surcharge=total_weight * 200, total=base+surcharge
  #            This formula must be manually applied to EVERY example row.
  Scenario Outline: Standard shipping with weight surcharges
    Given I have a cart with items:
      | sku        | name        | price | qty | weight |
      | HEAVY_ITEM | Heavy Item  | 10000 | 1   | <weight_kg> |
    And I select Standard shipping
    When I calculate the total including shipping
    Then the base shipping is 700 cents
    And the weight surcharge is <surcharge> cents
    And the total shipping cost is <total_shipping> cents

    # PAIN POINT: Formula: surcharge = weight * 200 cents/kg, total = 700 + surcharge
    #            Examples:
    #            0.5kg → 0.5*200=100 → total=800
    #            1.0kg → 1.0*200=200 → total=900
    #            2.0kg → 2.0*200=400 → total=1100
    #            5.0kg → 5.0*200=1000 → total=1700
    #            10.0kg → 10.0*200=2000 → total=2700
    #            What if the per-kg rate changes from 200 to 250? Update ALL calculations manually!
    Examples:
      | weight_kg | surcharge | total_shipping |
      | 0.5       | 100       | 800            |
      | 1.0       | 200       | 900            |
      | 1.5       | 300       | 1000           |
      | 2.0       | 400       | 1100           |
      | 2.5       | 500       | 1200           |
      | 3.0       | 600       | 1300           |
      | 5.0       | 1000      | 1700           |
      | 7.5       | 1500      | 2200           |
      | 10.0      | 2000      | 2700           |
      | 15.0      | 3000      | 3700           |


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
    And the volume discount is 75000 cents
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
    And the volume discount is 2250 cents

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

  # ============================================
  # 11. Complex Combinations (Examples of Manual Burden)
  # ============================================
  # SCENARIO: This requires manual calculation of multiple discounts
  # PAIN POINT: Magic numbers like "57750" - where did this come from?
  #            Must manually calculate: bulk(15%) on base, then VIP(5%) on remaining
  #            Then add shipping calculation with free threshold check
  Scenario: Complex cart with bulk + VIP + shipping (all tiers)
    Given I am a VIP customer with 5 years tenure
    And I have a cart with items:
      | sku         | name         | price | qty | weight |
      | PROD_A      | Product A    | 100000| 4   | 2.5    |
      | PROD_B      | Product B    | 200000| 1   | 5.0    |
    And I select Expedited shipping
    When I calculate the total including shipping
    Then the original total is 600000 cents
    And the volume discount is 60000 cents
    And the subtotal after bulk is 540000 cents
    And the VIP discount is 27000 cents
    Then the total discount is exactly 87000 cents
    And final total exceeds free shipping threshold
    And shipping is free
    And the discount is not capped

  # SCENARIO: Boundary case - exactly at bulk threshold
  # PAIN POINT: Tests ONE specific case (qty=3). What about qty=4? qty=999?
  Scenario: Single item exactly at bulk threshold (qty=3)
    Given I have a cart with items:
      | sku    | name    | price | qty | weight |
      | T_ITEM | Threshold | 50000 | 3   | 1.5    |
    When I calculate the total
    Then the volume discount is 22500 cents
    And the final total is 127500 cents

  # SCENARIO: Just below bulk threshold
  # PAIN POINT: Need separate scenario for qty=2 to prove rule doesn't apply
  Scenario: Single item just below bulk threshold (qty=2)
    Given I have a cart with items:
      | sku    | name    | price | qty | weight |
      | N_ITEM | No Bulk | 50000 | 2   | 1.5    |
    When I calculate the total
    Then the volume discount is 0 cents
    And the final total is 100000 cents

  # ============================================
  # 12. Precision Edge Cases
  # ============================================
  # SCENARIO: Odd pricing numbers to verify integer arithmetic
  # PAIN POINT: Manual verification required. Magic number verification:
  #            Original: (999 * 3) + (1999 * 4) = 2997 + 7996 = 10993
  #            Bulk: (999 * 3 * 0.15) + (1999 * 4 * 0.15) = 449.55 + 1199.4 = 1648.95 → 1649
  #            Is this correct? Must verify manually!
  Scenario: Precision with odd pricing (bulk on multiple items)
    Given I have a cart with items:
      | sku    | name    | price | qty | weight |
      | ODD_A  | Odd A   | 999   | 3   | 0.5    |
      | ODD_B  | Odd B   | 1999  | 4   | 0.8    |
    When I calculate the total
    Then the original total is 10993 cents
    Then the volume discount is 1649 cents
    And the final total is 9344 cents

  # ============================================
  # 13. Shipping Edge Cases
  # ============================================
  # SCENARIO: Cart qualifies for free shipping before discounts
  # PAIN POINT: Must verify this manually. Discounted price is 85000,
  #            free shipping threshold is 10000... wait, $100 = 10000 cents or 10000?
  #            Units confusion!
  Scenario: Cart over $100 before discounts gets free shipping
    Given I have a cart with items:
      | sku    | name    | price | qty | weight |
      | ITEM   | Large   | 120000| 1   | 3.0    |
    And I am a VIP customer with 5 years tenure
    And I select Standard shipping
    When I calculate the total including shipping
    Then the final total is 114000 cents
    And shipping is free

  # SCENARIO: Edge case: just above free shipping threshold ($100.01)
  # PAIN POINT: Magic number - must manually calculate weight shipping:
  #            Base: 700, Weight: (3.0 - 2.0) * 200 = 200, Total: 900 cents
  Scenario: Just over free shipping threshold
    Given I have a cart with items:
      | sku    | name    | price | qty | weight |
      | ITEM   | Item    | 10001 | 1   | 3.0    |
    And I select Standard shipping
    When I calculate the total including shipping
    Then shipping is free

  # ============================================
  # 14. Additional Mixed Bulk Scenarios
  # ============================================
  # SCENARIO: Multiple bulk items with different prices
  # PAIN POINT: Bulk calculation is complex - must verify:
  #            Item A: 10000 * 3 * 0.15 = 4500
  #            Item B: 20000 * 5 * 0.15 = 15000
  #            Item C: 5000 * 4 * 0.15 = 3000
  #            Total: 4500 + 15000 + 3000 = 22500
  Scenario: Three different bulk items with varying quantities
    Given I have a cart with items:
      | sku    | name    | price | qty | weight |
      | PROD_1 | Prod 1  | 10000 | 3   | 1.0    |
      | PROD_2 | Prod 2  | 20000 | 5   | 1.5    |
      | PROD_3 | Prod 3  | 5000  | 4   | 0.8    |
    When I calculate the total
    Then the volume discount is 22500 cents
    And the final total is 127500 cents

  # SCENARIO: Mixed bulk and non-bulk with VIP
  # PAIN POINT: Complexity explodes - manual verification required:
  #            Original: (5*50000) + (2*10000) = 250000 + 20000 = 270000
  #            Bulk: only on Product A → 50000 * 5 * 0.15 = 37500
  #            Subtotal after bulk: 270000 - 37500 = 232500
  #            VIP: 232500 * 0.05 = 11625
  #            Final: 232500 - 11625 = 220875
  #            Can you spot a calculation error? One typo breaks this.
  Scenario: Mixed bulk and non-bulk with VIP tier
    Given I am a VIP customer with 5 years tenure
    And I have a cart with items:
      | sku    | name        | price | qty | weight |
      | BULK_A | Bulk Item A | 50000 | 5   | 2.0    |
      | REG_B  | Reg Item B  | 10000 | 2   | 1.0    |
    When I calculate the total
    Then the original total is 270000 cents
    Then the volume discount is 37500 cents
    Then the subtotal after bulk is 232500 cents
    Then the VIP discount is 11625 cents
    Then the final total is 220875 cents
