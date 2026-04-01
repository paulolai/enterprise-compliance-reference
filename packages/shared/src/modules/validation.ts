/**
 * Shared Validation Schemas
 *
 * Single source of truth for validation rules across client and server.
 * Prevents schema drift between packages.
 *
 * @see docs/pricing-strategy.md §6 (Form Validation Rules)
 */

import { z } from 'zod';

// --------------------------------------------------------------------------
// Base Schemas
// --------------------------------------------------------------------------

/**
 * Email string schema
 */
export const EmailSchema = z.string().email('Invalid email format');

/**
 * Password schema - minimum 8 characters
 * Registration adds additional constraints (letter + number)
 */
export const PasswordSchema = z.string().min(8, 'Password must be at least 8 characters');

/**
 * Strong password schema - 8+ chars with at least 1 letter and 1 number
 */
export const StrongPasswordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[a-zA-Z]/, 'Password must contain at least one letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

/**
 * Name schema - minimum 2 characters
 */
export const NameSchema = z.string().min(2, 'Name must be at least 2 characters');

/**
 * Non-empty string schema
 */
export const NonEmptyStringSchema = z.string().min(1, 'This field is required');

// --------------------------------------------------------------------------
// Auth Schemas
// --------------------------------------------------------------------------

/**
 * Login request schema
 * @see docs/pricing-strategy.md §6.1
 */
export const LoginRequestSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
});

export type LoginRequest = z.infer<typeof LoginRequestSchema>;

/**
 * Register request schema
 * @see docs/pricing-strategy.md §6.2
 */
export const RegisterRequestSchema = z.object({
  name: NameSchema,
  email: EmailSchema,
  password: StrongPasswordSchema,
});

export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;

// --------------------------------------------------------------------------
// Shipping Address Schema
// --------------------------------------------------------------------------

/**
 * Shipping address schema
 * @see docs/pricing-strategy.md §7 (Checkout Validation)
 */
export const ShippingAddressSchema = z.object({
  fullName: NameSchema,
  streetAddress: NonEmptyStringSchema,
  city: NonEmptyStringSchema,
  state: NonEmptyStringSchema,
  zipCode: z.string().min(4, 'ZIP code must be at least 4 characters'),
  country: z.string().min(2).max(2).default('AU'),
});

export type ShippingAddress = z.infer<typeof ShippingAddressSchema>;

// --------------------------------------------------------------------------
// Payment Schema
// --------------------------------------------------------------------------

/**
 * Payment card schema
 * @see docs/pricing-strategy.md §7 (Checkout Validation)
 */
export const PaymentCardSchema = z.object({
  cardNumber: z.string().min(13, 'Card number must be at least 13 digits'),
  expiryDate: z.string().regex(/^\d{2}\/\d{2}$/, 'Expiry date must be in MM/YY format'),
  cvc: z.string().min(3, 'CVC must be at least 3 digits'),
});

export type PaymentCard = z.infer<typeof PaymentCardSchema>;

// --------------------------------------------------------------------------
// Re-exports for convenience
// --------------------------------------------------------------------------

export { z } from 'zod';
