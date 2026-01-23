import { z } from 'zod';
import {
  ShippingMethod,
  CartItemSchema, UserSchema, ShippingMethodSchema
} from './types.ts';
import type {
  CartItem, User, PricingResult, LineItemResult, ShipmentInfo, Cents
} from './types.ts';

export class PricingEngine {
  // Business Rules Constants
  private static readonly BULK_DISCOUNT_THRESHOLD_QTY = 3;
  private static readonly BULK_DISCOUNT_RATE = 0.15;
  private static readonly VIP_TENURE_THRESHOLD_YEARS = 2;
  private static readonly VIP_DISCOUNT_RATE = 0.05;
  private static readonly MAX_DISCOUNT_PERCENT = 0.30;
  private static readonly FREE_SHIPPING_THRESHOLD_CENTS = 10000;
  private static readonly STANDARD_BASE_SHIPPING_CENTS = 700;
  private static readonly EXPRESS_SHIPPING_CENTS = 2500;
  private static readonly WEIGHT_SURCHARGE_RATE_CENTS_PER_KG = 200;
  private static readonly EXPEDITED_SURCHARGE_RATE = 0.15;

  static calculate(items: CartItem[], user: User, shippingMethod: ShippingMethod = ShippingMethod.STANDARD): PricingResult {
    // Runtime Schema Validation (The "Executable Spec")
    // This ensures that the inputs conform to the business rules (e.g., non-negative prices, integer cents)
    // before any logic is executed.
    const validItems = z.array(CartItemSchema).parse(items);
    const validUser = UserSchema.parse(user);
    const validMethod = ShippingMethodSchema.parse(shippingMethod);

    let originalTotal: Cents = 0;
    let volumeDiscountTotal: Cents = 0;

    const lineItemResults: LineItemResult[] = validItems.map(item => {
      const lineOriginalTotal = item.price * item.quantity;
      originalTotal += lineOriginalTotal;

      let bulkDiscount: Cents = 0;
      if (item.quantity >= PricingEngine.BULK_DISCOUNT_THRESHOLD_QTY) {
        bulkDiscount = Math.round(lineOriginalTotal * PricingEngine.BULK_DISCOUNT_RATE);
      }

      volumeDiscountTotal += bulkDiscount;

      return {
        sku: item.sku,
        name: item.name,
        originalPrice: item.price,
        quantity: item.quantity,
        totalBeforeDiscount: lineOriginalTotal,
        bulkDiscount,
        totalAfterBulk: lineOriginalTotal - bulkDiscount
      };
    });

    const subtotalAfterBulk = originalTotal - volumeDiscountTotal;

    // VIP Rule: 5% off subtotal if tenure > 2 years
    let vipDiscount: Cents = 0;
    if (validUser.tenureYears > PricingEngine.VIP_TENURE_THRESHOLD_YEARS) {
      vipDiscount = Math.round(subtotalAfterBulk * PricingEngine.VIP_DISCOUNT_RATE);
    }

    let totalDiscount = volumeDiscountTotal + vipDiscount;
    let isCapped = false;

    // Safety Valve: Max 30% discount
    const maxDiscount = Math.round(originalTotal * PricingEngine.MAX_DISCOUNT_PERCENT);
    if (totalDiscount > maxDiscount) {
      totalDiscount = maxDiscount;
      isCapped = true;
    }

    const finalTotal = originalTotal - totalDiscount;

    // === Step 2: Calculate Shipping ===
    const shipment = this.calculateShipping(
      validItems,
      originalTotal,
      finalTotal,
      validMethod
    );

    // === Step 3: Final Totals ===
    const grandTotal = finalTotal + shipment.totalShipping;

    return {
      originalTotal,
      volumeDiscountTotal,
      subtotalAfterBulk,
      vipDiscount,
      totalDiscount,
      isCapped,
      finalTotal,
      lineItems: lineItemResults,
      shipment,
      grandTotal
    };
  }

  // === Private Methods ===

  private static calculateShipping(
    items: CartItem[],
    originalSubtotal: Cents,
    discountedSubtotal: Cents,
    method: ShippingMethod
  ): ShipmentInfo {
    // Check free shipping threshold based on discounted total
    // > $100.00 = 10000 cents
    const isFreeShipping = discountedSubtotal > PricingEngine.FREE_SHIPPING_THRESHOLD_CENTS;

    if (isFreeShipping || method === ShippingMethod.EXPRESS) {
      // Free shipping or Express delivery
      if (method === ShippingMethod.EXPRESS) {
        return {
          method,
          baseShipping: 0,
          weightSurcharge: 0,
          expeditedSurcharge: 0,
          totalShipping: PricingEngine.EXPRESS_SHIPPING_CENTS,
          isFreeShipping: false
        };
      }

      // Free shipping threshold met
      return {
        method,
        baseShipping: PricingEngine.STANDARD_BASE_SHIPPING_CENTS,
        weightSurcharge: this.calculateWeightSurcharge(items),
        expeditedSurcharge: 0,
        totalShipping: 0,
        isFreeShipping: true
      };
    }

    // Calculate base shipping details
    const baseShipping = PricingEngine.STANDARD_BASE_SHIPPING_CENTS;
    const weightSurcharge = this.calculateWeightSurcharge(items);
    let expeditedSurcharge: Cents = 0;

    // Expedited: +15% on original subtotal (before discounts)
    if (method === ShippingMethod.EXPEDITED) {
      expeditedSurcharge = Math.round(originalSubtotal * PricingEngine.EXPEDITED_SURCHARGE_RATE);
    }

    const totalShipping = baseShipping + weightSurcharge + expeditedSurcharge;

    return {
      method,
      baseShipping,
      weightSurcharge,
      expeditedSurcharge,
      totalShipping,
      isFreeShipping: false
    };
  }

  private static calculateWeightSurcharge(items: CartItem[]): Cents {
    const totalWeight = items.reduce((sum, item) => sum + (item.weightInKg * item.quantity), 0);
    // $2 per kg = 200 cents per kg
    return Math.round(totalWeight * PricingEngine.WEIGHT_SURCHARGE_RATE_CENTS_PER_KG);
  }
}
