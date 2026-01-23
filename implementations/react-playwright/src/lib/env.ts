/**
 * Environment Configuration (Zod-Validated)
 *
 * This module provides type-safe access to environment variables with
 * validation at startup. Invalid configuration causes the application to
 * fail fast rather than failing at runtime with unclear errors.
 *
 * ZOD-FIRST ARCHITECTURE:
 * - Zod schemas are the single source of truth for all runtime validation
 * - TypeScript types derive from schemas via z.infer<>
 * - All environment access goes through the validated `env` object
 *
 * @see ADR-10: Result Pattern for Error Handling
 * @see PRODUCTION_READY_PLAN.md Part 6.1: Configuration Management
 */

import { z } from 'zod';

/**
 * Environment Schema
 *
 * Defines all environment variables with their validation rules.
 * All fields are optional with sensible defaults unless marked otherwise.
 */
const envSchema = z.object({
  // Application environment
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),

  // Server configuration
  PORT: z.coerce.number().int().positive().default(5173),

  // Database configuration
  DATABASE_PATH: z.string().default('./data/shop.db'),

  // Stripe configuration (optional - handles feature flag for payments)
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),

  // CORS configuration
  CORS_ORIGINS: z.string().default('http://localhost:5173'),

  // Logging
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  // CI/CD flag (read-only, usually set by CI systems)
  CI: z.boolean().optional(),

  // Feature flags
  ENABLE_DEBUG_ENDPOINTS: z.boolean().default(true),
  ENABLE_PAYMENTS: z.boolean().default(true),
});

/**
 * Type derived from schema
 *
 * This type is automatically generated from the Zod schema.
 * It will always be in sync with validation rules.
 */
export type Env = z.infer<typeof envSchema>;

/**
 * Parse and validate environment variables at startup
 *
 * Throws on invalid configuration to fail fast.
 * Transform functions normalize values (e.g., CORS_ORIGINS string to array).
 */
const rawEnv = {
  // Pass through existing env vars
  ...process.env,

  // Transform boolean-like strings to actual booleans
  ENABLE_DEBUG_ENDPOINTS: parseBoolean(process.env.ENABLE_DEBUG_ENDPOINTS, true),
  ENABLE_PAYMENTS: parseBoolean(process.env.ENABLE_PAYMENTS, true),
};

/**
 * Validated environment configuration
 *
 * This object contains type-safe, validated environment values.
 * Import this wherever environment access is needed.
 *
 * @example
 * import { env } from '@/lib/env';
 *
 * if (env.NODE_ENV === 'production') {
 *   // Production-specific code
 * }
 */
export const env = envSchema.parse(rawEnv) as Env & {
  // Provide normalized CORS origins as an array
  corsOrigins: string[];
};

// Parse CORS origins as array
env.corsOrigins = env.CORS_ORIGINS.split(',').map(origin => origin.trim());

/**
 * Helper to parse boolean environment variables
 *
 * Handles common boolean representations:
 * - true: 'true', '1', 'yes', 'on'
 * - false: 'false', '0', 'no', 'off', undefined
 */
function parseBoolean(
  value: string | undefined,
  defaultValue: boolean
): boolean {
  if (value === undefined) {
    return defaultValue;
  }
  const normalized = value.toLowerCase().trim();
  if (['true', '1', 'yes', 'on'].includes(normalized)) {
    return true;
  }
  if (['false', '0', 'no', 'off'].includes(normalized)) {
    return false;
  }
  return defaultValue;
}

/**
 * Check if running in production
 */
export const isProduction = env.NODE_ENV === 'production';

/**
 * Check if running in test mode
 */
export const isTest = env.NODE_ENV === 'test';

/**
 * Check if running in development mode
 */
export const isDevelopment = env.NODE_ENV === 'development';

/**
 * Check if Stripe is properly configured
 */
export const isStripeConfigured = !!env.STRIPE_SECRET_KEY;

/**
 * Check if debug endpoints should be enabled
 */
export const isDebugEnabled = env.ENABLE_DEBUG_ENDPOINTS && !isProduction;

/**
 * Get the current application URL
 * Useful for generating absolute URLs in responses
 */
export const getAppUrl = (): string => {
  const host = process.env.HOST || 'localhost';
  const protocol = isProduction ? 'https' : 'http';
  return `${protocol}://${host}:${env.PORT}`;
};

/**
 * Validate environment configuration without throwing
 *
 * Returns a Result object instead of throwing for use in
 * initialization code that needs to handle validation errors gracefully.
 */
export function tryParseEnv(): { success: true; env: Env } | { success: false; error: z.ZodError } {
  const result = envSchema.safeParse(rawEnv);
  if (result.success) {
    const validated = {
      ...result.data,
      corsOrigins: result.data.CORS_ORIGINS.split(',').map(origin => origin.trim()),
    } as Env & { corsOrigins: string[] };
    return { success: true, env: validated };
  }
  return { success: false, error: result.error };
}

/**
 * Print environment summary for startup logging
 *
 * Masks sensitive values like API keys.
 */
export function getEnvSummary(): Record<string, unknown> {
  return {
    NODE_ENV: env.NODE_ENV,
    PORT: env.PORT,
    DATABASE_PATH: env.DATABASE_PATH,
    STRIPE_CONFIGURED: isStripeConfigured,
    CORS_ORIGINS: env.corsOrigins,
    LOG_LEVEL: env.LOG_LEVEL,
    ENABLE_DEBUG_ENDPOINTS: env.ENABLE_DEBUG_ENDPOINTS,
    ENABLE_PAYMENTS: env.ENABLE_PAYMENTS,
  };
}
