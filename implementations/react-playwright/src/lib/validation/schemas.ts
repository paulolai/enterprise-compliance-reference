/**
 * Request/Response Schemas
 *
 * Centralized Zod schemas for all API request and response validation.
 * These schemas are the single source of truth for API contracts.
 *
 * ZOD-FIRST ARCHITECTURE:
 * - Schemas define the "executable specification" for all endpoints
 * - TypeScript types derive from schemas via z.infer<>
 * - Use these schemas in validation middleware before route handlers
 *
 * @see PRODUCTION_READY_PLAN.md Part 5.1: Comprehensive Zod Validation Pipeline
 * @see middleware.ts for validation helper functions
 */

import { z } from 'zod';
import {
  CentsSchema,
  PricingResultSchema,
  ShippingMethodSchema,
  UserSchema,
} from '@executable-specs/shared';
import {
  CartItemSchema,
  CartItemRequestSchema,
  AddToCartRequestSchema,
  RemoveFromCartRequestSchema,
  UpdateCartQuantitySchema,
} from '../../domain/cart/schema.ts';

// --------------------------------------------------------------------------
// Base Schemas
// --------------------------------------------------------------------------

/**
 * Email string schema
 */
export const EmailSchema = z.string().email();

/**
 * UUID string schema
 */
export const UuidSchema = z.string().uuid();

/**
 * Non-empty string schema
 */
export const NonEmptyStringSchema = z.string().min(1);

/**
 * Positive integer schema
 */
export const PositiveIntSchema = z.number().int().positive();

/**
 * Pagination query schema
 */
export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;

// --------------------------------------------------------------------------
// Auth Schemas
// --------------------------------------------------------------------------

/**
 * Login request schema
 */
export const LoginRequestSchema = z.object({
  email: EmailSchema,
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export type LoginRequest = z.infer<typeof LoginRequestSchema>;

/**
 * Login response schema
 */
export const LoginResponseSchema = z.object({
  success: z.literal(true),
  user: UserSchema,
  token: z.string().optional(), // Future: JWT token
});

export type LoginResponse = z.infer<typeof LoginResponseSchema>;

/**
 * Logout request schema
 */
export const LogoutRequestSchema = z.object({
  email: EmailSchema,
});

export type LogoutRequest = z.infer<typeof LogoutRequestSchema>;

// --------------------------------------------------------------------------
// Shipping Schemas
// --------------------------------------------------------------------------

/**
 * Set shipping method request schema
 */
export const SetShippingRequestSchema = z.object({
  method: ShippingMethodSchema,
});

export type SetShippingRequest = z.infer<typeof SetShippingRequestSchema>;

/**
 * Shipping address schema
 */
export const ShippingAddressSchema = z.object({
  street: NonEmptyStringSchema,
  city: NonEmptyStringSchema,
  state: NonEmptyStringSchema,
  zip: z.string().min(3),
  country: z.string().min(2).max(2).default('AU'),
});

export type ShippingAddress = z.infer<typeof ShippingAddressSchema>;

// --------------------------------------------------------------------------
// Pricing Schemas
// --------------------------------------------------------------------------

/**
 * Calculate pricing request schema
 */
export const CalculatePricingRequestSchema = z.object({
  items: z.array(CartItemSchema).min(1, 'Cart must have at least one item'),
  user: UserSchema.optional().nullable(),
  method: ShippingMethodSchema.default('STANDARD'),
});

export type CalculatePricingRequest = z.infer<typeof CalculatePricingRequestSchema>;

/**
 * Calculate pricing response schema
 */
export const CalculatePricingResponseSchema = z.object({
  success: z.literal(true),
  result: PricingResultSchema,
});

export type CalculatePricingResponse = z.infer<typeof CalculatePricingResponseSchema>;

// --------------------------------------------------------------------------
// Payment Schemas
// --------------------------------------------------------------------------

/**
 * Create payment intent request schema
 */
export const CreatePaymentIntentRequestSchema = z.object({
  amount: CentsSchema.positive(),
  cartId: NonEmptyStringSchema,
  userId: NonEmptyStringSchema,
  cartItems: z.array(CartItemRequestSchema).min(1),
});

export type CreatePaymentIntentRequest = z.infer<typeof CreatePaymentIntentRequestSchema>;

/**
 * Create payment intent response schema
 */
export const CreatePaymentIntentResponseSchema = z.object({
  paymentIntentId: z.string(),
  clientSecret: z.string(),
  amount: CentsSchema,
  currency: z.string().default('aud'),
});

export type CreatePaymentIntentResponse = z.infer<typeof CreatePaymentIntentResponseSchema>;

/**
 * Confirm payment request schema
 */
export const ConfirmPaymentRequestSchema = z.object({
  paymentIntentId: NonEmptyStringSchema,
  cartItems: z.array(CartItemRequestSchema).min(1),
  shippingAddress: ShippingAddressSchema,
});

export type ConfirmPaymentRequest = z.infer<typeof ConfirmPaymentRequestSchema>;

/**
 * Confirm payment response schema
 */
export const ConfirmPaymentResponseSchema = z.object({
  orderId: z.string(),
  status: z.string(),
  total: CentsSchema,
  paymentIntentId: z.string(),
  createdAt: z.number(),
});

export type ConfirmPaymentResponse = z.infer<typeof ConfirmPaymentResponseSchema>;

/**
 * Cancel payment request schema
 */
export const CancelPaymentRequestSchema = z.object({
  paymentIntentId: NonEmptyStringSchema,
  reason: z.string().optional(),
});

export type CancelPaymentRequest = z.infer<typeof CancelPaymentRequestSchema>;

/**
 * Cancel payment response schema
 */
export const CancelPaymentResponseSchema = z.object({
  paymentIntentId: z.string(),
  status: z.string(),
});

export type CancelPaymentResponse = z.infer<typeof CancelPaymentResponseSchema>;

/**
 * Get payment intent response schema
 */
export const GetPaymentIntentResponseSchema = z.object({
  paymentIntentId: z.string(),
  status: z.string(),
  amount: CentsSchema,
  currency: z.string(),
  createdAt: z.number(),
  metadata: z.record(z.string()),
});

export type GetPaymentIntentResponse = z.infer<typeof GetPaymentIntentResponseSchema>;

// --------------------------------------------------------------------------
// Order Schemas
// --------------------------------------------------------------------------

/**
 * Create order request schema (internal, not exposed)
 */
export const CreateOrderRequestSchema = z.object({
  userId: NonEmptyStringSchema,
  items: z.array(CartItemRequestSchema).min(1),
  total: CentsSchema.positive(),
  pricingResult: PricingResultSchema,
  shippingAddress: ShippingAddressSchema,
  stripePaymentIntentId: NonEmptyStringSchema,
});

export type CreateOrderRequest = z.infer<typeof CreateOrderRequestSchema>;

/**
 * Get order by ID request schema
 */
export const GetOrderRequestSchema = z.object({
  orderId: NonEmptyStringSchema,
});

export type GetOrderRequest = z.infer<typeof GetOrderRequestSchema>;

/**
 * Get order response schema
 */
export const GetOrderResponseSchema = z.object({
  order: z.object({
    id: z.string(),
    userId: z.string(),
    status: z.string(),
    total: CentsSchema,
    pricingResult: PricingResultSchema,
    shippingAddress: ShippingAddressSchema,
    stripePaymentIntentId: z.string(),
    createdAt: z.number(),
    updatedAt: z.number(),
  }),
  items: z.array(z.object({
    id: z.string(),
    sku: z.string(),
    quantity: PositiveIntSchema,
    price: CentsSchema,
    weightInKg: z.number(),
    discount: CentsSchema,
    createdAt: z.number(),
  })),
});

export type GetOrderResponse = z.infer<typeof GetOrderResponseSchema>;

/**
 * List orders query schema
 */
export const ListOrdersQuerySchema = PaginationQuerySchema.extend({
  userId: EmailSchema.optional(),
  status: z.string().optional(),
});

export type ListOrdersQuery = z.infer<typeof ListOrdersQuerySchema>;

/**
 * Delete order request schema
 */
export const DeleteOrderRequestSchema = z.object({
  orderId: NonEmptyStringSchema,
});

export type DeleteOrderRequest = z.infer<typeof DeleteOrderRequestSchema>;

// --------------------------------------------------------------------------
// Product Schemas
// --------------------------------------------------------------------------

/**
 * Get product request schema
 */
export const GetProductRequestSchema = z.object({
  sku: z.string().min(1),
});

export type GetProductRequest = z.infer<typeof GetProductRequestSchema>;

/**
 * List products query schema
 */
export const ListProductsQuerySchema = PaginationQuerySchema.extend({
  category: z.string().optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
});

export type ListProductsQuery = z.infer<typeof ListProductsQuerySchema>;

// --------------------------------------------------------------------------
// Debug Schemas
// --------------------------------------------------------------------------

/**
 * Seed session request schema
 */
export const SeedSessionRequestSchema = z.object({
  cart: z.array(CartItemSchema).min(1),
  user: UserSchema.optional(),
  shippingMethod: ShippingMethodSchema.optional(),
});

export type SeedSessionRequest = z.infer<typeof SeedSessionRequestSchema>;

/**
 * Seed session response schema
 */
export const SeedSessionResponseSchema = z.object({
  success: z.literal(true),
  itemCount: z.number(),
  items: z.array(CartItemSchema),
  user: UserSchema.nullable(),
  shippingMethod: ShippingMethodSchema,
});

export type SeedSessionResponse = z.infer<typeof SeedSessionResponseSchema>;

/**
 * Seed auth request schema
 */
export const SeedAuthRequestSchema = z.object({
  email: EmailSchema,
});

export type SeedAuthRequest = z.infer<typeof SeedAuthRequestSchema>;

/**
 * Reset state response schema
 */
export const ResetStateResponseSchema = z.object({
  success: z.literal(true),
  items: z.array(CartItemSchema),
  user: z.null(),
  shippingMethod: ShippingMethodSchema,
  pricingResult: PricingResultSchema.nullable(),
});

export type ResetStateResponse = z.infer<typeof ResetStateResponseSchema>;

// --------------------------------------------------------------------------
// Error Response Schemas
// --------------------------------------------------------------------------

/**
 * Standard error response schema
 */
export const ErrorResponseSchema = z.object({
  error: z.string(),
  message: z.string(),
  statusCode: z.number(),
  requestId: z.string().optional(),
});

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

/**
 * Validation error response schema
 */
export const ValidationErrorResponseSchema = ErrorResponseSchema.extend({
  fields: z.record(z.array(z.string())),
});

export type ValidationErrorResponse = z.infer<typeof ValidationErrorResponseSchema>;

/**
 * Rate limited error response schema
 */
export const RateLimitedErrorResponseSchema = ErrorResponseSchema.extend({
  retryAfter: z.number().optional(),
});

export type RateLimitedErrorResponse = z.infer<typeof RateLimitedErrorResponseSchema>;

// --------------------------------------------------------------------------
// Bulk export
// --------------------------------------------------------------------------

/**
 * All request schemas (for request body validation)
 */
export const requestSchemas = {
  login: LoginRequestSchema,
  logout: LogoutRequestSchema,
  addToCart: AddToCartRequestSchema,
  removeFromCart: RemoveFromCartRequestSchema,
  updateCartQuantity: UpdateCartQuantitySchema,
  setShipping: SetShippingRequestSchema,
  calculatePricing: CalculatePricingRequestSchema,
  createOrder: CreateOrderRequestSchema,
  createPaymentIntent: CreatePaymentIntentRequestSchema,
  confirmPayment: ConfirmPaymentRequestSchema,
  cancelPayment: CancelPaymentRequestSchema,
  getOrder: GetOrderRequestSchema,
  listOrders: ListOrdersQuerySchema,
  deleteOrder: DeleteOrderRequestSchema,
  getProduct: GetProductRequestSchema,
  listProducts: ListProductsQuerySchema,
  seedSession: SeedSessionRequestSchema,
  seedAuth: SeedAuthRequestSchema,
} as const;

/**
 * All response schemas (for response validation in tests)
 */
export const responseSchemas = {
  login: LoginResponseSchema,
  logout: z.object({ success: z.literal(true) }),
  calculatePricing: CalculatePricingResponseSchema,
  createPaymentIntent: CreatePaymentIntentResponseSchema,
  confirmPayment: ConfirmPaymentResponseSchema,
  cancelPayment: CancelPaymentResponseSchema,
  getPaymentIntent: GetPaymentIntentResponseSchema,
  getOrder: GetOrderResponseSchema,
  listOrders: z.object({ orders: z.array(GetOrderResponseSchema.shape.order) }),
  deleteOrder: z.object({ success: z.literal(true) }),
  getProduct: z.object({ product: CartItemSchema }),
  listProducts: z.object({ products: z.array(CartItemSchema) }),
  seedSession: SeedSessionResponseSchema,
  seedAuth: z.object({ success: z.literal(true), user: UserSchema }),
  resetState: ResetStateResponseSchema,
  error: ErrorResponseSchema,
  validationError: ValidationErrorResponseSchema,
  rateLimited: RateLimitedErrorResponseSchema,
} as const;

/**
 * All query param schemas
 */
export const querySchemas = {
  pagination: PaginationQuerySchema,
  listOrders: ListOrdersQuerySchema,
  listProducts: ListProductsQuerySchema,
} as const;

/**
 * All param schemas
 */
export const paramSchemas = {
  orderId: z.object({ orderId: NonEmptyStringSchema }),
  productSku: z.object({ sku: z.string().min(1) }),
  paymentIntentId: z.object({ id: z.string() }),
} as const;