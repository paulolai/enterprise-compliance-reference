import { z } from 'zod';

export const shippingAddressSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  streetAddress: z.string().min(1, 'Street address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  zipCode: z.string().min(4, 'ZIP code is required'),
});

export const paymentSchema = z.object({
  cardNumber: z.string().min(13, 'Card number must be at least 13 digits'),
  expiryDate: z.string().regex(/^(0[1-9]|1[0-2])\/\d{2}$/, 'Expiry date must be in MM/YY format'),
  cvc: z.string().min(3, 'CVC must be at least 3 digits'),
});

export const checkoutFormSchema = z.object({
  shipping: shippingAddressSchema,
  payment: paymentSchema,
});

export type ShippingAddress = z.infer<typeof shippingAddressSchema>;
export type PaymentInfo = z.infer<typeof paymentSchema>;
export type CheckoutFormData = z.infer<typeof checkoutFormSchema>;
