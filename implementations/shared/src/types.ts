import { z } from 'zod';

// --- Domain Schemas (The Executable Specification) ---

export enum ShippingMethod {
  STANDARD = 'STANDARD',
  EXPEDITED = 'EXPEDITED',
  EXPRESS = 'EXPRESS'
}

export const ShippingMethodSchema = z.nativeEnum(ShippingMethod);

/**
 * Monetary value in integer cents (e.g., 100 = $1.00)
 * Constraint: Must be an integer and non-negative.
 */
export const CentsSchema = z.number().int().nonnegative().describe("Integer cents");
export type Cents = z.infer<typeof CentsSchema>;

/**
 * Monetary value in dollars (e.g., 1.00)
 */
export type Dollars = number;

export const CartItemSchema = z.object({
  sku: z.string().min(1),
  name: z.string(),
  price: CentsSchema, // The canonical property
  quantity: z.number().int().positive(),
  weightInKg: z.number().nonnegative()
});
export type CartItem = z.infer<typeof CartItemSchema>;

/**
 * Extended CartItem for compatibility with existing code that uses 'priceInCents'
 * This is used in tests and some internal code. For internal use, prefer 'price'.
 */
export type CartItemWithPriceInCents = Omit<CartItem, 'price'> & { priceInCents: Cents };

export const UserSchema = z.object({
  tenureYears: z.number().nonnegative(),
  email: z.string().email().optional(),
  name: z.string().optional(), // Optional name for display/debug purposes
});
export type User = z.infer<typeof UserSchema>;

// Order status enum
export enum OrderStatus {
  PENDING = 'pending',
  PAID = 'paid',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled'
}

export const OrderStatusSchema = z.nativeEnum(OrderStatus);

export const LineItemResultSchema = z.object({
  sku: z.string(),
  name: z.string(),
  originalPrice: CentsSchema,
  quantity: z.number().int(),
  totalBeforeDiscount: CentsSchema,
  bulkDiscount: CentsSchema,
  totalAfterBulk: CentsSchema
});
export type LineItemResult = z.infer<typeof LineItemResultSchema>;

export const ShipmentInfoSchema = z.object({
  method: ShippingMethodSchema,
  baseShipping: CentsSchema,
  weightSurcharge: CentsSchema,
  expeditedSurcharge: CentsSchema,
  totalShipping: CentsSchema,
  isFreeShipping: z.boolean()
});
export type ShipmentInfo = z.infer<typeof ShipmentInfoSchema>;

export const PricingResultSchema = z.object({
  originalTotal: CentsSchema,
  volumeDiscountTotal: CentsSchema,
  subtotalAfterBulk: CentsSchema,
  vipDiscount: CentsSchema,
  totalDiscount: CentsSchema,
  isCapped: z.boolean(),
  finalTotal: CentsSchema,
  lineItems: z.array(LineItemResultSchema),
  shipment: ShipmentInfoSchema,
  grandTotal: CentsSchema
});
export type PricingResult = z.infer<typeof PricingResultSchema>;


// --- Utilities ---

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
