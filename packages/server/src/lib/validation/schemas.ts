import { z } from 'zod';
import { ShippingMethod } from '@executable-specs/shared';

export const requestSchemas = {
  calculatePricing: z.object({
    items: z.array(z.object({
      sku: z.string(),
      name: z.string(),
      price: z.number(),
      quantity: z.number(),
      weightInKg: z.number(),
    })),
    user: z.object({
      tenureYears: z.number(),
    }),
    method: z.nativeEnum(ShippingMethod),
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
    user: z.object({
      email: z.string(),
      name: z.string(),
      tenureYears: z.number(),
    }),
  }),

  seedSession: z.object({
    items: z.array(z.object({
      sku: z.string(),
      name: z.string(),
      price: z.number(),
      quantity: z.number(),
      weightInKg: z.number(),
    })),
    shippingMethod: z.nativeEnum(ShippingMethod),
  }),

  createOrder: z.object({
    items: z.array(z.object({
      sku: z.string(),
      name: z.string(),
      price: z.number(),
      quantity: z.number(),
      weightInKg: z.number(),
    })),
    shippingMethod: z.nativeEnum(ShippingMethod),
    user: z.object({
      tenureYears: z.number(),
    }),
  }),

  createPaymentIntent: z.object({
    amount: z.number(),
    currency: z.string(),
  }),

  confirmPayment: z.object({
    paymentIntentId: z.string(),
  }),

  cancelPayment: z.object({
    paymentIntentId: z.string(),
  }),
};

export const paramSchemas = {
  sku: z.object({
    sku: z.string(),
  }),
  orderId: z.object({
    orderId: z.string(),
  }),
  paymentIntentId: z.object({
    paymentIntentId: z.string(),
  }),
};

export const querySchemas = {
  productFilter: z.object({
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
