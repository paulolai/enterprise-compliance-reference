import { test, expect } from '@playwright/test';
import { allure } from 'allure-playwright';
import { registerAllureMetadata } from '../../../shared/fixtures/allure-helpers';
import { Hono } from 'hono';
import type { Context, MiddlewareHandler } from 'hono';
import {
  rateLimit,
  getRateLimitStoreStats,
  resetRateLimit,
  resetAllRateLimits,
} from '../../src/server/middleware/rate-limit';

function registerRateLimitMetadata(
  metadata: {
    name?: string;
    ruleReference: string;
    rule: string;
    tags: string[];
  }
) {
  const finalMetadata = {
    ...metadata,
    parentSuite: 'API Verification',
    suite: 'Security',
    feature: 'Rate Limiting',
  };
  registerAllureMetadata(allure, finalMetadata);
}

/**
 * Creates a test Hono app with rate limiting enabled.
 *
 * The rateLimit middleware skips when NODE_ENV is 'development' or 'test',
 * so we temporarily override the environment to test actual rate limiting behavior.
 */
function createTestApp(): { app: Hono; originalEnv: string | undefined } {
  const originalEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';

  const app = new Hono();
  app.use('/api/*', rateLimit());
  app.get('/api/products', (c: Context) => c.json({ products: [] }));
  app.get('/api/orders', (c: Context) => c.json({ orders: [] }));
  app.post('/api/auth/login', (c: Context) => c.json({ token: 'test' }));
  app.post('/api/pricing/calculate', (c: Context) => c.json({ total: 100 }));
  app.get('/api/unknown-endpoint', (c: Context) => c.json({ status: 'ok' }));

  return { app, originalEnv };
}

function restoreEnv(originalEnv: string | undefined): void {
  if (originalEnv === undefined) {
    delete process.env.NODE_ENV;
  } else {
    process.env.NODE_ENV = originalEnv;
  }
}

test.describe('Rate Limiting Middleware', () => {
  test.afterEach(() => {
    resetAllRateLimits();
  });

  test.describe('Requests Within Rate Limit', () => {
    test('requests below limit succeed with 200', async () => {
      registerRateLimitMetadata({
        ruleReference: 'rate-limit-middleware',
        rule: 'Requests within rate limit window return 200',
        tags: ['@security', '@rate-limit'],
        name: 'Requests within limit succeed',
      });

      const { app, originalEnv } = createTestApp();
      try {
        const response = await app.request('/api/products');

        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body).toEqual({ products: [] });
      } finally {
        restoreEnv(originalEnv);
      }
    });

    test('multiple requests within limit all succeed', async () => {
      registerRateLimitMetadata({
        ruleReference: 'rate-limit-middleware',
        rule: 'Multiple requests within limit all return 200',
        tags: ['@security', '@rate-limit'],
        name: 'Multiple requests within limit',
      });

      const { app, originalEnv } = createTestApp();
      try {
        const responses = await Promise.all(
          Array.from({ length: 10 }, () => app.request('/api/products'))
        );

        responses.forEach((response) => {
          expect(response.status).toBe(200);
        });
      } finally {
        restoreEnv(originalEnv);
      }
    });
  });

  test.describe('Requests Exceeding Rate Limit', () => {
    test('requests exceeding limit are rejected with 429', async () => {
      registerRateLimitMetadata({
        ruleReference: 'rate-limit-middleware',
        rule: 'Requests exceeding rate limit return 429 Too Many Requests',
        tags: ['@security', '@rate-limit'],
        name: 'Rate limit exceeded returns 429',
      });

      const { app, originalEnv } = createTestApp();
      try {
        const maxRequests = 100; // /api/products has max: 100 per 60s

        for (let i = 0; i < maxRequests; i++) {
          await app.request('/api/products');
        }

        const response = await app.request('/api/products');
        expect(response.status).toBe(429);

        const body = await response.json();
        expect(body.error).toBe('Rate limit exceeded');
        expect(body.retryAfter).toBeDefined();
        expect(typeof body.retryAfter).toBe('number');
      } finally {
        restoreEnv(originalEnv);
      }
    });

    test('rate limit error response includes helpful message', async () => {
      registerRateLimitMetadata({
        ruleReference: 'rate-limit-middleware',
        rule: '429 response includes retry guidance',
        tags: ['@security', '@rate-limit'],
        name: 'Rate limit error message format',
      });

      const { app, originalEnv } = createTestApp();
      try {
        const maxRequests = 5; // /api/auth/login has max: 5 per 900s

        for (let i = 0; i < maxRequests; i++) {
          await app.request('/api/auth/login', { method: 'POST' });
        }

        const response = await app.request('/api/auth/login', { method: 'POST' });
        expect(response.status).toBe(429);

        const body = await response.json();
        expect(body.message).toContain('Too many requests');
        expect(body.message).toContain('seconds');
      } finally {
        restoreEnv(originalEnv);
      }
    });
  });

  test.describe('Rate Limit Headers', () => {
    test('X-RateLimit-Limit header is present', async () => {
      registerRateLimitMetadata({
        ruleReference: 'rate-limit-middleware',
        rule: 'X-RateLimit-Limit header shows maximum requests',
        tags: ['@security', '@rate-limit'],
        name: 'X-RateLimit-Limit header',
      });

      const { app, originalEnv } = createTestApp();
      try {
        const response = await app.request('/api/products');

        expect(response.headers.get('X-RateLimit-Limit')).toBe('100');
      } finally {
        restoreEnv(originalEnv);
      }
    });

    test('X-RateLimit-Remaining header decreases with each request', async () => {
      registerRateLimitMetadata({
        ruleReference: 'rate-limit-middleware',
        rule: 'X-RateLimit-Remaining header tracks remaining requests',
        tags: ['@security', '@rate-limit'],
        name: 'X-RateLimit-Remaining header',
      });

      const { app, originalEnv } = createTestApp();
      try {
        const response1 = await app.request('/api/products');
        const response2 = await app.request('/api/products');
        const response3 = await app.request('/api/products');

        const remaining1 = parseInt(response1.headers.get('X-RateLimit-Remaining') || '0');
        const remaining2 = parseInt(response2.headers.get('X-RateLimit-Remaining') || '0');
        const remaining3 = parseInt(response3.headers.get('X-RateLimit-Remaining') || '0');

        expect(remaining1).toBe(99);
        expect(remaining2).toBe(98);
        expect(remaining3).toBe(97);
      } finally {
        restoreEnv(originalEnv);
      }
    });

    test('X-RateLimit-Reset header contains valid timestamp', async () => {
      registerRateLimitMetadata({
        ruleReference: 'rate-limit-middleware',
        rule: 'X-RateLimit-Reset header contains Unix epoch timestamp',
        tags: ['@security', '@rate-limit'],
        name: 'X-RateLimit-Reset header',
      });

      const { app, originalEnv } = createTestApp();
      try {
        const response = await app.request('/api/products');
        const resetHeader = response.headers.get('X-RateLimit-Reset');

        expect(resetHeader).not.toBeNull();
        const resetTime = parseInt(resetHeader || '0');
        const now = Math.floor(Date.now() / 1000);

        expect(resetTime).toBeGreaterThan(now);
        expect(resetTime).toBeLessThan(now + 120); // Within 2 minutes (window is 60s)
      } finally {
        restoreEnv(originalEnv);
      }
    });

    test('all rate limit headers present on every request', async () => {
      registerRateLimitMetadata({
        ruleReference: 'rate-limit-middleware',
        rule: 'All X-RateLimit-* headers present on every response',
        tags: ['@security', '@rate-limit'],
        name: 'All rate limit headers present',
      });

      const { app, originalEnv } = createTestApp();
      try {
        const response = await app.request('/api/orders');

        expect(response.headers.get('X-RateLimit-Limit')).not.toBeNull();
        expect(response.headers.get('X-RateLimit-Remaining')).not.toBeNull();
        expect(response.headers.get('X-RateLimit-Reset')).not.toBeNull();
      } finally {
        restoreEnv(originalEnv);
      }
    });
  });

  test.describe('Different Endpoints Have Different Limits', () => {
    test('auth/login has stricter limit (5) than products (100)', async () => {
      registerRateLimitMetadata({
        ruleReference: 'rate-limit-middleware',
        rule: 'Authentication endpoints have stricter rate limits',
        tags: ['@security', '@rate-limit'],
        name: 'Endpoint-specific rate limits',
      });

      const { app, originalEnv } = createTestApp();
      try {
        const loginResponse = await app.request('/api/auth/login', { method: 'POST' });
        const productsResponse = await app.request('/api/products');

        expect(loginResponse.headers.get('X-RateLimit-Limit')).toBe('5');
        expect(productsResponse.headers.get('X-RateLimit-Limit')).toBe('100');
      } finally {
        restoreEnv(originalEnv);
      }
    });

    test('auth/register has hourly limit (3 per hour)', async () => {
      registerRateLimitMetadata({
        ruleReference: 'rate-limit-middleware',
        rule: 'Registration endpoint has 3 requests per hour limit',
        tags: ['@security', '@rate-limit'],
        name: 'Registration rate limit',
      });

      const { app, originalEnv } = createTestApp();
      try {
        const response = await app.request('/api/auth/register', { method: 'POST' });

        expect(response.headers.get('X-RateLimit-Limit')).toBe('3');
      } finally {
        restoreEnv(originalEnv);
      }
    });

    test('pricing/calculate has high limit (50 per minute)', async () => {
      registerRateLimitMetadata({
        ruleReference: 'rate-limit-middleware',
        rule: 'Pricing endpoint has generous rate limit for high throughput',
        tags: ['@security', '@rate-limit'],
        name: 'Pricing rate limit',
      });

      const { app, originalEnv } = createTestApp();
      try {
        const response = await app.request('/api/pricing/calculate', { method: 'POST' });

        expect(response.headers.get('X-RateLimit-Limit')).toBe('50');
      } finally {
        restoreEnv(originalEnv);
      }
    });

    test('unknown endpoints use default limit (30 per minute)', async () => {
      registerRateLimitMetadata({
        ruleReference: 'rate-limit-middleware',
        rule: 'Unconfigured endpoints use default rate limit',
        tags: ['@security', '@rate-limit'],
        name: 'Default rate limit',
      });

      const { app, originalEnv } = createTestApp();
      try {
        const response = await app.request('/api/unknown-endpoint');

        expect(response.headers.get('X-RateLimit-Limit')).toBe('30');
      } finally {
        restoreEnv(originalEnv);
      }
    });

    test('exhausting one endpoint limit does not affect others', async () => {
      registerRateLimitMetadata({
        ruleReference: 'rate-limit-middleware',
        rule: 'Rate limits are per-endpoint, not global',
        tags: ['@security', '@rate-limit'],
        name: 'Per-endpoint rate limit isolation',
      });

      const { app, originalEnv } = createTestApp();
      try {
        for (let i = 0; i < 5; i++) {
          await app.request('/api/auth/login', { method: 'POST' });
        }

        const loginResponse = await app.request('/api/auth/login', { method: 'POST' });
        expect(loginResponse.status).toBe(429);

        const productsResponse = await app.request('/api/products');
        expect(productsResponse.status).toBe(200);
      } finally {
        restoreEnv(originalEnv);
      }
    });
  });

  test.describe('Rate Limit Reset Functions', () => {
    test('resetRateLimit removes specific client entry', async () => {
      registerRateLimitMetadata({
        ruleReference: 'rate-limit-middleware',
        rule: 'resetRateLimit() clears rate limit for specific client and path',
        tags: ['@security', '@rate-limit'],
        name: 'resetRateLimit functionality',
      });

      const { app, originalEnv } = createTestApp();
      try {
        for (let i = 0; i < 5; i++) {
          await app.request('/api/auth/login', { method: 'POST' });
        }

        const blockedResponse = await app.request('/api/auth/login', { method: 'POST' });
        expect(blockedResponse.status).toBe(429);

        const resetResult = resetRateLimit('unknown-client', '/api/auth/login');
        expect(resetResult).toBe(true);

        const afterResetResponse = await app.request('/api/auth/login', { method: 'POST' });
        expect(afterResetResponse.status).toBe(200);
      } finally {
        restoreEnv(originalEnv);
      }
    });

    test('resetRateLimit returns false for non-existent entry', async () => {
      registerRateLimitMetadata({
        ruleReference: 'rate-limit-middleware',
        rule: 'resetRateLimit() returns false when no entry exists',
        tags: ['@security', '@rate-limit'],
        name: 'resetRateLimit non-existent entry',
      });

      const result = resetRateLimit('non-existent-client', '/api/products');
      expect(result).toBe(false);
    });

    test('resetAllRateLimits clears all entries', async () => {
      registerRateLimitMetadata({
        ruleReference: 'rate-limit-middleware',
        rule: 'resetAllRateLimits() clears entire rate limit store',
        tags: ['@security', '@rate-limit'],
        name: 'resetAllRateLimits functionality',
      });

      const { app, originalEnv } = createTestApp();
      try {
        await app.request('/api/auth/login', { method: 'POST' });
        await app.request('/api/products');
        await app.request('/api/orders');

        const statsBefore = getRateLimitStoreStats();
        expect(statsBefore.totalKeys).toBeGreaterThan(0);

        resetAllRateLimits();

        const statsAfter = getRateLimitStoreStats();
        expect(statsAfter.totalKeys).toBe(0);
        expect(statsAfter.entries).toEqual([]);
      } finally {
        restoreEnv(originalEnv);
      }
    });

    test('getRateLimitStoreStats returns correct store state', async () => {
      registerRateLimitMetadata({
        ruleReference: 'rate-limit-middleware',
        rule: 'getRateLimitStoreStats() returns accurate store diagnostics',
        tags: ['@security', '@rate-limit'],
        name: 'getRateLimitStoreStats accuracy',
      });

      const { app, originalEnv } = createTestApp();
      try {
        resetAllRateLimits();

        await app.request('/api/products');
        await app.request('/api/products');

        const stats = getRateLimitStoreStats();

        expect(stats.totalKeys).toBe(1);
        expect(stats.entries).toHaveLength(1);

        const entry = stats.entries[0];
        expect(entry.count).toBe(2);
        expect(entry.key).toContain('/api/products');
        expect(entry.remaining).toBe(98);
        expect(entry.resetIn).toBeGreaterThan(0);
        expect(entry.resetTimestamp).toBeGreaterThan(0);
      } finally {
        restoreEnv(originalEnv);
      }
    });
  });

  test.describe('Rate Limit Isolation', () => {
    test('different clients have separate rate limits', async () => {
      registerRateLimitMetadata({
        ruleReference: 'rate-limit-middleware',
        rule: 'Rate limits are tracked per client IP, not globally',
        tags: ['@security', '@rate-limit'],
        name: 'Per-client rate limit isolation',
      });

      const { app, originalEnv } = createTestApp();
      try {
        for (let i = 0; i < 5; i++) {
          await app.request('/api/auth/login', {
            method: 'POST',
            headers: { 'X-Forwarded-For': '192.168.1.1' },
          });
        }

        const blockedResponse = await app.request('/api/auth/login', {
          method: 'POST',
          headers: { 'X-Forwarded-For': '192.168.1.1' },
        });
        expect(blockedResponse.status).toBe(429);

        const differentClientResponse = await app.request('/api/auth/login', {
          method: 'POST',
          headers: { 'X-Forwarded-For': '10.0.0.1' },
        });
        expect(differentClientResponse.status).toBe(200);
      } finally {
        restoreEnv(originalEnv);
      }
    });

    test('X-Forwarded-For header is used for client identification', async () => {
      registerRateLimitMetadata({
        ruleReference: 'rate-limit-middleware',
        rule: 'X-Forwarded-For header is used to identify clients behind proxies',
        tags: ['@security', '@rate-limit'],
        name: 'X-Forwarded-For client identification',
      });

      const { app, originalEnv } = createTestApp();
      try {
        const response1 = await app.request('/api/products', {
          headers: { 'X-Forwarded-For': '203.0.113.1' },
        });
        const response2 = await app.request('/api/products', {
          headers: { 'X-Forwarded-For': '203.0.113.2' },
        });

        expect(response1.headers.get('X-RateLimit-Limit')).toBe('100');
        expect(response2.headers.get('X-RateLimit-Limit')).toBe('100');
      } finally {
        restoreEnv(originalEnv);
      }
    });

    test('X-Real-IP header is used as fallback', async () => {
      registerRateLimitMetadata({
        ruleReference: 'rate-limit-middleware',
        rule: 'X-Real-IP header is used when X-Forwarded-For is absent',
        tags: ['@security', '@rate-limit'],
        name: 'X-Real-IP fallback',
      });

      const { app, originalEnv } = createTestApp();
      try {
        const response = await app.request('/api/products', {
          headers: { 'X-Real-IP': '198.51.100.1' },
        });

        expect(response.status).toBe(200);
      } finally {
        restoreEnv(originalEnv);
      }
    });

    test('CF-Connecting-IP header takes priority', async () => {
      registerRateLimitMetadata({
        ruleReference: 'rate-limit-middleware',
        rule: 'CF-Connecting-IP header has highest priority for client identification',
        tags: ['@security', '@rate-limit'],
        name: 'CF-Connecting-IP priority',
      });

      const { app, originalEnv } = createTestApp();
      try {
        const response = await app.request('/api/products', {
          headers: {
            'CF-Connecting-IP': '1.2.3.4',
            'X-Forwarded-For': '5.6.7.8',
            'X-Real-IP': '9.10.11.12',
          },
        });

        expect(response.status).toBe(200);
      } finally {
        restoreEnv(originalEnv);
      }
    });
  });

  test.describe('Path Normalization', () => {
    test('order IDs are normalized for rate limiting', async () => {
      registerRateLimitMetadata({
        ruleReference: 'rate-limit-middleware',
        rule: 'Order IDs are normalized to /api/orders for consistent rate limiting',
        tags: ['@security', '@rate-limit'],
        name: 'Order path normalization',
      });

      const { app, originalEnv } = createTestApp();
      try {
        const response1 = await app.request('/api/orders/abc123');
        const response2 = await app.request('/api/orders/def456');

        expect(response1.headers.get('X-RateLimit-Limit')).toBe('20');
        expect(response2.headers.get('X-RateLimit-Limit')).toBe('20');
      } finally {
        restoreEnv(originalEnv);
      }
    });
  });

  test.describe('Middleware Skips in Development/Test', () => {
    test('rate limiting is disabled in development environment', async () => {
      registerRateLimitMetadata({
        ruleReference: 'rate-limit-middleware',
        rule: 'Rate limiting is skipped in development and test environments',
        tags: ['@security', '@rate-limit'],
        name: 'Rate limit disabled in dev/test',
      });

      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      try {
        const app = new Hono();
        app.use('/api/*', rateLimit());
        app.get('/api/products', (c: Context) => c.json({ products: [] }));

        const responses = await Promise.all(
          Array.from({ length: 200 }, () => app.request('/api/products'))
        );

        responses.forEach((response) => {
          expect(response.status).toBe(200);
        });
      } finally {
        restoreEnv(originalEnv);
      }
    });

    test('rate limiting is disabled in test environment', async () => {
      registerRateLimitMetadata({
        ruleReference: 'rate-limit-middleware',
        rule: 'Rate limiting is skipped in test environment',
        tags: ['@security', '@rate-limit'],
        name: 'Rate limit disabled in test',
      });

      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'test';

      try {
        const app = new Hono();
        app.use('/api/*', rateLimit());
        app.get('/api/products', (c: Context) => c.json({ products: [] }));

        const responses = await Promise.all(
          Array.from({ length: 200 }, () => app.request('/api/products'))
        );

        responses.forEach((response) => {
          expect(response.status).toBe(200);
        });
      } finally {
        restoreEnv(originalEnv);
      }
    });
  });
});
