/**
 * TYPES DUPLICATED FROM EXECUTABLE SPECS IMPLEMENTATION
 *
 * NOTE: This code is duplicated rather than shared to keep each implementation
 * self-contained for a fair comparison. In a real project, you might share this,
 * but the duplication makes the "translation layer tax" comparison more honest.
 */
export enum ShippingMethod {
  STANDARD = 'STANDARD',
  EXPEDITED = 'EXPEDITED',
  EXPRESS = 'EXPRESS'
}

/**
 * Monetary value in integer cents (e.g., 100 = $1.00)
 */
export type Cents = number;

/**
 * Monetary value in dollars (e.g., 1.00)
 */
export type Dollars = number;

export interface CartItem {
  sku: string;
  name: string;
  price: Cents; // AUD, incl 10% GST
  quantity: number;
  weightInKg: number; // Item weight for shipping calculation
}

export interface User {
  tenureYears: number;
}

export interface LineItemResult {
  sku: string;
  name: string;
  originalPrice: Cents;
  quantity: number;
  totalBeforeDiscount: Cents;
  bulkDiscount: Cents;
  totalAfterBulk: Cents;
}

export interface ShipmentInfo {
  method: ShippingMethod;
  baseShipping: Cents;
  weightSurcharge: Cents;
  expeditedSurcharge: Cents;
  totalShipping: Cents;
  isFreeShipping: boolean;
}

export interface PricingResult {
  originalTotal: Cents;
  bulkDiscountTotal: Cents;
  subtotalAfterBulk: Cents;
  vipDiscount: Cents;
  totalDiscount: Cents;
  isCapped: boolean;
  finalTotal: Cents;
  lineItems: LineItemResult[];
  shipment: ShipmentInfo;
  grandTotal: Cents;
}

/**
 * Utility to convert dollars to cents safely
 */
export function toCents(dollars: Dollars): Cents {
  return Math.round(dollars * 100);
}

/**
 * Utility to convert cents to dollars for display
 */
export function toDollars(cents: Cents): Dollars {
  return cents / 100;
}

/**
 * Utility to format cents as a currency string
 */
export function formatCurrency(cents: Cents): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD'
  }).format(toDollars(cents));
}
