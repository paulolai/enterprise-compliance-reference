/**
 * Environment configuration
 */
export const isDevelopment = process.env.NODE_ENV === 'development';
export const isProduction = process.env.NODE_ENV === 'production';
export const isStripeConfigured = !!process.env.STRIPE_SECRET_KEY;

export const env = {
  PORT: parseInt(process.env.PORT || '3000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_PATH: process.env.DATABASE_PATH || './data/shop.db',
};

export const getEnvSummary = () => ({
  nodeEnv: env.NODE_ENV,
  port: env.PORT,
  databasePath: env.DATABASE_PATH,
  stripeConfigured: isStripeConfigured,
});
