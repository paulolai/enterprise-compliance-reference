/**
 * Cart Domain Schemas
 *
 * Single source of truth for Cart domain types and validation.
 * Derived from shared core schemas.
 */

import { z } from 'zod';
import {
  CartItemSchema as SharedCartItemSchema,
  CentsSchema as SharedCentsSchema,
  PricingResultSchema as SharedPricingResultSchema,
  ShippingMethodSchema as SharedShippingMethodSchema,
  UserSchema as SharedUserSchema,
} from '@executable-specs/shared';

// Re-export base domain schemas
export const CentsSchema = SharedCentsSchema;
export const CartItemSchema = SharedCartItemSchema;
export const PricingResultSchema = SharedPricingResultSchema;
export const ShippingMethodSchema = SharedShippingMethodSchema;
export const UserSchema = SharedUserSchema;

// Domain Types
export type Cents = z.infer<typeof CentsSchema>;
export type CartItem = z.infer<typeof CartItemSchema>;
export type PricingResult = z.infer<typeof PricingResultSchema>;
export type User = z.infer<typeof UserSchema>;

/**
 * Cart item as received from client requests.
 * Uses priceInCents for legacy compatibility.
 */
export const CartItemRequestSchema = z.object({
  sku: z.string().min(1),
  priceInCents: CentsSchema,
  quantity: z.number().int().positive(),
  weightInKg: z.number().nonnegative(),
});

export type CartItemRequest = z.infer<typeof CartItemRequestSchema>;

/**
 * Add to cart request schema
 */
export const AddToCartRequestSchema = z.object({
  item: CartItemRequestSchema,
});

export type AddToCartRequest = z.infer<typeof AddToCartRequestSchema>;

/**
 * Remove from cart request schema
 */
export const RemoveFromCartRequestSchema = z.object({
  sku: z.string().min(1),
});

export type RemoveFromCartRequest = z.infer<typeof RemoveFromCartRequestSchema>;

/**
 * Update cart quantity request schema
 */
export const UpdateCartQuantitySchema = z.object({
  sku: z.string().min(1),
  quantity: z.number().int().positive(),
});

export type UpdateCartQuantity = z.infer<typeof UpdateCartQuantitySchema>;
