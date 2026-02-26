# Pricing Strategy

This document defines the business rules for the Pricing Engine.

## 1. Base Pricing
- All prices are in integer cents.
- Subtotal is the sum of (price * quantity) for all items.

## 2. Bulk Discounts
- If a line item has 3 or more units, apply a **15% discount** to that line item.

## 3. VIP Discounts
- If a user has been with us for more than 2 years (tenure > 2), apply a **5% discount** to the entire subtotal (after bulk discounts).

## 4. Discount Cap
- The total discount (Bulk + VIP) must never exceed **30%** of the original subtotal.

## 5. Shipping Rules
- **Standard Shipping**: $7.00 base + $2.00 per kg.
- **Free Shipping**: If the final total (after discounts) is > $100.00, standard shipping is free.
- **Express Shipping**: Fixed at $25.00 (never free).
- **Expedited Shipping**: Standard shipping + 15% surcharge on the original subtotal.
