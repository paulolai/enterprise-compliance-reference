import { CartItem, User, PricingResult, LineItemResult, ShippingMethod, ShipmentInfo, Cents } from './types';

export class PricingEngine {
  static calculate(items: CartItem[], user: User, shippingMethod: ShippingMethod = ShippingMethod.STANDARD): PricingResult {
    let originalTotal: Cents = 0;
    let bulkDiscountTotal: Cents = 0;
    
    const lineItemResults: LineItemResult[] = items.map(item => {
      const lineOriginalTotal = item.price * item.quantity;
      originalTotal += lineOriginalTotal;
      
      let bulkDiscount: Cents = 0;
      if (item.quantity >= 3) {
        bulkDiscount = Math.round(lineOriginalTotal * 0.15);
      }
      
      bulkDiscountTotal += bulkDiscount;
      
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

    const subtotalAfterBulk = originalTotal - bulkDiscountTotal;
    
    // VIP Rule: 5% off subtotal if tenure > 2 years
    let vipDiscount: Cents = 0;
    if (user.tenureYears > 2) {
      vipDiscount = Math.round(subtotalAfterBulk * 0.05);
    }

    let totalDiscount = bulkDiscountTotal + vipDiscount;
    let isCapped = false;

    // Safety Valve: Max 30% discount
    const maxDiscount = Math.round(originalTotal * 0.30);
    if (totalDiscount > maxDiscount) {
      totalDiscount = maxDiscount;
      isCapped = true;
    }

    const finalTotal = originalTotal - totalDiscount;

    // === Step 2: Calculate Shipping ===
    const shipment = this.calculateShipping(
      items,
      originalTotal,
      finalTotal,
      shippingMethod
    );

    // === Step 3: Final Totals ===
    const grandTotal = finalTotal + shipment.totalShipping;

    return {
      originalTotal,
      bulkDiscountTotal,
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
    const isFreeShipping = discountedSubtotal > 10000;

    if (isFreeShipping || method === ShippingMethod.EXPRESS) {
      // Free shipping or Express delivery
      if (method === ShippingMethod.EXPRESS) {
        return {
          method,
          baseShipping: 0,
          weightSurcharge: 0,
          expeditedSurcharge: 0,
          totalShipping: 2500, // $25.00
          isFreeShipping: false
        };
      }

      // Free shipping threshold met
      return {
        method,
        baseShipping: 700, // $7.00
        weightSurcharge: this.calculateWeightSurcharge(items),
        expeditedSurcharge: 0,
        totalShipping: 0,
        isFreeShipping: true
      };
    }

    // Calculate base shipping details
    const baseShipping = 700; // $7.00
    const weightSurcharge = this.calculateWeightSurcharge(items);
    let expeditedSurcharge: Cents = 0;

    // Expedited: +15% on original subtotal (before discounts)
    if (method === ShippingMethod.EXPEDITED) {
      expeditedSurcharge = Math.round(originalSubtotal * 0.15);
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
    return Math.round(totalWeight * 200);
  }
}
