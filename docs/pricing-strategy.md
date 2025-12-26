# Pricing Strategy

This document represents the single source of truth for the Dynamic Pricing Engine.
All implementations must strictly adhere to these rules.

## 1. Base Rules (Currency & Tax)
- **Currency:** All monetary values are in **AUD**.
- **GST:** A 10% Goods and Services Tax is **included** in the base shelf price of every item.
- **Precision:** All final calculations should be rounded to 2 decimal places.
- **Invariant:** `Final Total` <= `Original Total` (Prices never increase).

## 2. Bulk Discounts
**Goal:** Encourage larger basket sizes.
- **Rule:** If a customer buys **3 or more** of the *same* SKU (Stock Keeping Unit), that specific line item is discounted by **15%**.
- **Invariant:** Any line item with Quantity >= 3 MUST have a 15% discount applied.

## 3. VIP Tier
**Goal:** Reward long-term loyalty.
- **Eligibility:** Users with a tenure of **more than 2 years**.
- **Rule:** VIPs receive a flat **5% discount** on the *cart subtotal*.
- **Ordering:** This discount is applied **after** any Bulk Discounts have been calculated.
- **Invariant:** If User Tenure > 2, a 5% discount is applied to the post-bulk subtotal.

## 4. Safety Valve
**Goal:** Prevent stacking discounts from eroding all margin.
- **Rule:** The **total discount amount** (Bulk + VIP) must strictly **never exceed 30%** of the original cart value (Sum of base prices).
- **Enforcement:** If the calculated discount exceeds 30%, the discount is capped at exactly 30% of the total original value.
- **Invariant:** `Total Discount` <= 30% of `Original Total`.
