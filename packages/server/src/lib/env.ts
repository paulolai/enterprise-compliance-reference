/**
 * Environment configuration
 */
export const isDevelopment = process.env.NODE_ENV === 'development';
export const isProduction = process.env.NODE_ENV === 'production';
export const isStripeConfigured = !!process.env.STRIPE_SECRET_KEY;
