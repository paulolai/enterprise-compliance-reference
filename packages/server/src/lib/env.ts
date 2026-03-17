/**
 * Environment configuration
 */
export const isDevelopment = process.env.NODE_ENV === 'development';
export const isProduction = process.env.NODE_ENV === 'production';
export const isStripeConfigured = !!process.env.STRIPE_SECRET_KEY;

export const env = {
  PORT: parseInt(process.env.PORT || '3000'),
};

export function getEnvSummary() {
  return {
    NODE_ENV: process.env.NODE_ENV,
    PORT: env.PORT,
  };
}
