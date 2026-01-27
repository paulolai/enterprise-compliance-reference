import type { MiddlewareHandler } from 'hono';
import type { Context } from 'hono';

/**
 * Rate Limit Configuration
 *
 * Defines rate limiting rules per endpoint.
 * Window is in seconds, max is the maximum requests allowed.
 */
interface RateLimitConfig {
  window: number;  // Time window in seconds
  max: number;     // Maximum requests allowed per window
}

interface RateLimitEntry {
  count: number;
  reset: number;  // Timestamp when the window resets
  firstRequest: number; // Timestamp of first request in window
}

/**
 * Rate Limit Rules
 *
 * Per-endpoint rate limits for production use.
 * Authentication endpoints have strict limits to prevent brute force.
 * High-throughput endpoints like pricing have generous limits.
 */
const RATE_LIMITS: Record<string, RateLimitConfig> = {
  '/api/auth/login': { window: 900, max: 5 },      // 5 per 15 minutes
  '/api/auth/register': { window: 3600, max: 3 },   // 3 per hour
  '/api/payments/create-intent': { window: 60, max: 10 },  // 10 per minute
  '/api/pricing/calculate': { window: 60, max: 50 },      // 50 per minute
  '/api/orders': { window: 60, max: 20 },
  '/api/products': { window: 60, max: 100 },
};

/**
 * Default rate limit for endpoints not explicitly configured.
 */
const DEFAULT_LIMIT: RateLimitConfig = { window: 60, max: 30 };

/**
 * In-memory rate limit store.
 *
 * In production, this should be replaced with Redis or another distributed
 * cache to ensure limits are consistent across multiple instances.
 */
const limitStore = new Map<string, RateLimitEntry>();

/**
 * Cleanup function to remove expired entries.
 *
 * Periodically removes expired rate limit entries to prevent memory leaks.
 * Called automatically every time a limit check is performed.
 */
function cleanupExpiredEntries(): void {
  const now = Date.now();
  for (const [key, entry] of limitStore.entries()) {
    if (entry.reset <= now) {
      limitStore.delete(key);
    }
  }
}

/**
 * Get client identifier from request.
 *
 * Uses IP address from request headers, falling back to a generic identifier
 * if no IP is available.
 */
function getClientId(c: Context): string {
  // Try CF-Connecting-IP (Cloudflare)
  const cfIp = c.req.header('cf-connecting-ip');
  if (cfIp) return cfIp;

  // Try X-Forwarded-For (nginx, proxies)
  const xForwardedFor = c.req.header('x-forwarded-for');
  if (xForwardedFor) {
    // Take the first IP in the chain
    return xForwardedFor.split(',')[0].trim();
  }

  // Try X-Real-IP (nginx)
  const xRealIp = c.req.header('x-real-ip');
  if (xRealIp) return xRealIp;

  // Fallback: use a generic identifier
  // In production, this should never happen behind a proper reverse proxy
  return c.req.header('user-agent') || 'anonymous';
}

/**
 * Normalize path for rate limit lookup.
 *
 * Removes query parameters and IDs for consistent rate limiting.
 * Example: /api/orders/123 -> /api/orders/*
 */
function normalizePath(path: string): string {
  // For orders, normalize to /api/orders/*
  if (/^\/api\/orders\/[a-f0-9-]+$/i.test(path)) {
    return '/api/orders';
  }
  // For user-specific order lookups
  if (/^\/api\/orders\/user\/[^/]+$/i.test(path)) {
    return '/api/orders/user';
  }

  // Return path as-is for other endpoints
  return path;
}

/**
 * Get rate limit config for a request path.
 */
function getLimitConfig(path: string): RateLimitConfig {
  const normalized = normalizePath(path);

  // Check for exact match
  if (RATE_LIMITS[normalized]) {
    return RATE_LIMITS[normalized];
  }

  // Check for prefix match (e.g., /api/auth/login matches /api/auth)
  const parts = normalized.split('/');
  for (let i = parts.length; i > 0; i--) {
    const prefix = parts.slice(0, i).join('/');
    if (RATE_LIMITS[prefix + '/*'] || RATE_LIMITS[prefix]) {
      return RATE_LIMITS[prefix + '/*'] || RATE_LIMITS[prefix];
    }
  }

  return DEFAULT_LIMIT;
}

/**
 * Rate Limiting Middleware
 *
 * Enforces rate limits based on client IP address and request path.
 * Returns appropriate headers (X-RateLimit-*) to inform clients of their
 * current usage and reset time.
 *
 * Rate limit responses include headers:
 * - X-RateLimit-Limit: Maximum requests per window
 * - X-RateLimit-Remaining: Remaining requests in current window
 * - X-RateLimit-Reset: Timestamp when window resets (Unix epoch)
 * - Retry-After: Seconds until retry is allowed (on 429 responses)
 *
 * @example
 * ```ts
 * app.use('/api/*', rateLimit());
 * ```
 */
export const rateLimit = (): MiddlewareHandler => {
  return async (c, next) => {
    // Skip rate limiting for health endpoints and static assets
    const path = c.req.path;
    if (path === '/health' || path === '/readyz' || path === '/livez' ||
        path.startsWith('/src/') || path.startsWith('/node_modules/') ||
        path.endsWith('.html') || path.endsWith('.css') || path.endsWith('.js') ||
        path.endsWith('.json') || path.endsWith('.png') || path.endsWith('.svg') ||
        path.endsWith('.jpg') || path.endsWith('.jpeg') || path.endsWith('.ico')) {
      return next();
    }

    cleanupExpiredEntries();

    const clientId = getClientId(c);
    const limitConfig = getLimitConfig(path);
    const key = `${clientId}:${path}`;

    const now = Date.now();
    const entry = limitStore.get(key);

    if (!entry || now >= entry.reset) {
      // Create new window
      const newEntry: RateLimitEntry = {
        count: 1,
        reset: now + limitConfig.window * 1000,
        firstRequest: now,
      };
      limitStore.set(key, newEntry);

      // Add rate limit headers
      c.header('X-RateLimit-Limit', limitConfig.max.toString());
      c.header('X-RateLimit-Remaining', (limitConfig.max - 1).toString());
      c.header('X-RateLimit-Reset', Math.floor(newEntry.reset / 1000).toString());

      return next();
    }

    // Check if limit exceeded
    if (entry.count >= limitConfig.max) {
      const retryAfter = Math.ceil((entry.reset - now) / 1000);

      return c.json({
        error: 'Rate limit exceeded',
        message: `Too many requests. Please try again in ${retryAfter} seconds.`,
        retryAfter,
      }, 429);
    }

    // Increment counter
    entry.count++;
    limitStore.set(key, entry);

    // Add rate limit headers
    c.header('X-RateLimit-Limit', limitConfig.max.toString());
    c.header('X-RateLimit-Remaining', (limitConfig.max - entry.count).toString());
    c.header('X-RateLimit-Reset', Math.floor(entry.reset / 1000).toString());

    return next();
  };
};

/**
 * Get current rate limit store contents.
 *
 * Diagnostic function to inspect current rate limit state.
 * Useful for debugging and monitoring.
 */
export const getRateLimitStoreStats = (): {
  totalKeys: number;
  entries: Array<{
    key: string;
    count: number;
    remaining: number;
    resetTimestamp: number;
    resetIn: number;
  }>;
} => {
  const now = Date.now();

  return {
    totalKeys: limitStore.size,
    entries: Array.from(limitStore.entries()).map(([key, entry]) => {
      const config = getLimitConfig(key.split(':')[1] || '/*');
      return {
        key,
        count: entry.count,
        remaining: Math.max(0, config.max - entry.count),
        resetTimestamp: entry.reset,
        resetIn: Math.max(0, Math.ceil((entry.reset - now) / 1000)),
      };
    }),
  };
};

/**
 * Reset rate limit for a specific client.
 *
 * Diagnostic/support function to reset a client's rate limit.
 * Useful for testing and incident response.
 */
export const resetRateLimit = (clientId: string, path: string): boolean => {
  const key = `${clientId}:${path}`;
  return limitStore.delete(key);
};

/**
 * Reset all rate limits.
 *
 * Dangerous - use with caution in production.
 * Useful for testing and emergency scenarios.
 */
export const resetAllRateLimits = (): void => {
  limitStore.clear();
};
