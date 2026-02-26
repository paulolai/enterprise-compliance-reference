import { z } from 'zod';
import { ShippingMethod } from '@executable-specs/shared';

export const requestSchemas = {
  calculatePricing: z.object({
    items: z.array(z.object({
      sku: z.string(),
      name: z.string(),
      price: z.number().optional(),
      priceInCents: z.number().optional(),
      quantity: z.number(),
      weightInKg: z.number(),
    })),
    user: z.object({
      tenureYears: z.number(),
    }).optional().nullable(),
    method: z.nativeEnum(ShippingMethod).optional(),
  }),

  login: z.object({
    email: z.string().email(),
    password: z.string().min(1),
  }),

  register: z.object({
    email: z.string().email(),
    name: z.string().min(1),
    password: z.string().min(1),
  }),

  seedAuth: z.object({
    email: z.string(),
  }),

  seedSession: z.object({
    cart: z.array(z.object({
      sku: z.string(),
      name: z.string(),
      price: z.number().optional(),
      priceInCents: z.number().optional(),
      quantity: z.number(),
      weightInKg: z.number(),
    })).optional(),
    user: z.object({
      email: z.string().optional(),
      name: z.string().optional(),
      tenureYears: z.number().optional(),
    }).optional().nullable(),
    shippingMethod: z.nativeEnum(ShippingMethod).optional(),
  }),

  createOrder: z.object({
    userId: z.string(),
    items: z.array(z.object({
      sku: z.string(),
      name: z.string(),
      price: z.number().optional(),
      priceInCents: z.number().optional(),
      quantity: z.number(),
      weightInKg: z.number(),
    })),
    total: z.number(),
    pricingResult: z.any(),
    shippingAddress: z.any(),
    stripePaymentIntentId: z.string(),
  }),

  createPaymentIntent: z.object({
    amount: z.number(),
    cartId: z.string(),
    userId: z.string(),
    cartItems: z.array(z.any()),
  }),

  confirmPayment: z.object({
    paymentIntentId: z.string(),
    cartItems: z.array(z.any()),
    shippingAddress: z.any(),
  }),

  cancelPayment: z.object({
    paymentIntentId: z.string(),
    reason: z.string().optional(),
  }),
};

export const paramSchemas = {
  productSku: z.object({
    sku: z.string(),
  }),
  orderId: z.object({
    orderId: z.string(),
  }),
  paymentIntentId: z.object({
    id: z.string(),
  }),
};

export const querySchemas = {
  listProducts: z.object({
    category: z.string().optional(),
    minPrice: z.coerce.number().optional(),
    maxPrice: z.coerce.number().optional(),
  }),
};

// Export types
export type CalculatePricingRequest = z.infer<typeof requestSchemas.calculatePricing>;
export type LoginRequest = z.infer<typeof requestSchemas.login>;
export type SeedAuthRequest = z.infer<typeof requestSchemas.seedAuth>;
export type SeedSessionRequest = z.infer<typeof requestSchemas.seedSession>;
export type CreateOrderRequest = z.infer<typeof requestSchemas.createOrder>;
export type GetOrderRequest = z.infer<typeof paramSchemas.orderId>;
export type CreatePaymentIntentRequest = z.infer<typeof requestSchemas.createPaymentIntent>;
export type ConfirmPaymentRequest = z.infer<typeof requestSchemas.confirmPayment>;
export type CancelPaymentRequest = z.infer<typeof requestSchemas.cancelPayment>;
export type GetPaymentIntentRequest = z.infer<typeof paramSchemas.paymentIntentId>;
