export interface CartItem {
  sku: string;
  name: string;
  price: number; // AUD, incl 10% GST
  quantity: number;
}

export interface User {
  tenureYears: number;
}

export interface LineItemResult {
  sku: string;
  name: string;
  originalPrice: number;
  quantity: number;
  totalBeforeDiscount: number;
  bulkDiscount: number;
  totalAfterBulk: number;
}

export interface PricingResult {
  originalTotal: number;
  bulkDiscountTotal: number;
  subtotalAfterBulk: number;
  vipDiscount: number;
  totalDiscount: number;
  isCapped: boolean;
  finalTotal: number;
  lineItems: LineItemResult[];
}
