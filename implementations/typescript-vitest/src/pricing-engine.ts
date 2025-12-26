import { CartItem, User, PricingResult, LineItemResult } from './types';

export class PricingEngine {
  static calculate(items: CartItem[], user: User): PricingResult {
    let originalTotal = 0;
    let bulkDiscountTotal = 0;
    
    const lineItemResults: LineItemResult[] = items.map(item => {
      const lineOriginalTotal = item.price * item.quantity;
      originalTotal += lineOriginalTotal;
      
      let bulkDiscount = 0;
      if (item.quantity >= 3) {
        bulkDiscount = lineOriginalTotal * 0.15;
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

    const subtotalAfterBulk = this.round(originalTotal - bulkDiscountTotal);
    
    // VIP Rule: 5% off subtotal if tenure > 2 years
    let vipDiscount = 0;
    if (user.tenureYears > 2) {
      vipDiscount = subtotalAfterBulk * 0.05;
    }

    let totalDiscount = bulkDiscountTotal + vipDiscount;
    let isCapped = false;

    // Safety Valve: Max 30% discount
    const maxDiscount = originalTotal * 0.30;
    if (totalDiscount > maxDiscount) {
      totalDiscount = maxDiscount;
      isCapped = true;
    }

    const finalTotal = originalTotal - totalDiscount;

    return {
      originalTotal: this.round(originalTotal),
      bulkDiscountTotal: this.round(bulkDiscountTotal),
      subtotalAfterBulk: this.round(subtotalAfterBulk),
      vipDiscount: this.round(vipDiscount),
      totalDiscount: this.round(totalDiscount),
      isCapped,
      finalTotal: this.round(finalTotal),
      lineItems: lineItemResults.map(li => ({
        ...li,
        bulkDiscount: this.round(li.bulkDiscount),
        totalAfterBulk: this.round(li.totalAfterBulk)
      }))
    };
  }

  private static round(val: number): number {
    return Math.round(val * 100) / 100;
  }
}
