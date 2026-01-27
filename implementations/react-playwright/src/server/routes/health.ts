import { Hono } from 'hono';
import { isStripeConfigured } from '../../lib/env';
import { db } from '@executable-specs/shared/index-server';
import Stripe from 'stripe';

const router = new Hono();

/**
 * GET /health
 * Simple liveness probe - returns 200 if the app is running.
 * Used by Kubernetes/proxies to check if the pod is alive.
 */
router.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

/**
 * GET /readyz
 * Readiness probe with dependency checks.
 * Used by Kubernetes to determine if the pod can receive traffic.
 */
router.get('/readyz', async (c) => {
  const checks: Record<string, { status: 'healthy' | 'unhealthy'; message?: string }> = {};

  // Database connectivity check
  try {
    await db.select({ _: 1 }); // Simple query to test connection
    checks.database = { status: 'healthy' };
  } catch (error) {
    checks.database = {
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }

  // Stripe API check (if configured)
  if (isStripeConfigured) {
    try {
      const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
      if (stripeSecretKey) {
        const stripe = new Stripe(stripeSecretKey, {
          apiVersion: '2025-12-15.clover',
        });
        // Simple check - retrieve an account balance
        await stripe.balance.retrieve();
        checks.stripe = { status: 'healthy' };
      }
    } catch (error) {
      checks.stripe = {
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  } else {
    checks.stripe = { status: 'healthy', message: 'Not configured (feature disabled)' };
  }

  // Memory usage check
  const memoryUsage = process.memoryUsage();
  const memoryUsedMB = memoryUsage.heapUsed / 1024 / 1024;
  const memoryTotalMB = memoryUsage.heapTotal / 1024 / 1024;
  const memoryRatio = memoryUsedMB / memoryTotalMB;

  if (memoryRatio > 0.9) {
    checks.memory = {
      status: 'unhealthy',
      message: `Memory usage high: ${memoryUsedMB.toFixed(2)}MB/${memoryTotalMB.toFixed(2)}MB (${(memoryRatio * 100).toFixed(1)}%)`,
    };
  } else {
    checks.memory = {
      status: 'healthy',
      message: `${memoryUsedMB.toFixed(2)}MB/${memoryTotalMB.toFixed(2)}MB (${(memoryRatio * 100).toFixed(1)}%)`,
    };
  }

  // Determine overall status
  const allHealthy = Object.values(checks).every((check) => check.status === 'healthy');
  const statusCode = allHealthy ? 200 : 503;

  return c.json({
    status: allHealthy ? 'ready' : 'not ready',
    timestamp: new Date().toISOString(),
    checks,
  }, statusCode);
});

/**
 * Latency tracking for detailed health metrics
 */
interface LatencyBucket {
  count: number;
  totalMs: number;
  maxMs: number;
  minMs: number;
}
const latencyBuckets = new Map<string, LatencyBucket>();

function recordLatency(action: string, durationMs: number): void {
  const bucket = latencyBuckets.get(action) || {
    count: 0,
    totalMs: 0,
    maxMs: -Infinity,
    minMs: Infinity,
  };
  bucket.count++;
  bucket.totalMs += durationMs;
  bucket.maxMs = Math.max(bucket.maxMs, durationMs);
  bucket.minMs = Math.min(bucket.minMs, durationMs);
  latencyBuckets.set(action, bucket);
}

function getLatencySummary(action: string): { count: number; avgMs: number; maxMs: number; minMs: number } | null {
  const bucket = latencyBuckets.get(action);
  if (!bucket || bucket.count === 0) return null;
  return {
    count: bucket.count,
    avgMs: bucket.totalMs / bucket.count,
    maxMs: bucket.maxMs === -Infinity ? 0 : bucket.maxMs,
    minMs: bucket.minMs === Infinity ? 0 : bucket.minMs,
  };
}

/**
 * GET /livez
 * Detailed health status including latency bucketing and resource metrics.
 * Provides comprehensive health information for monitoring dashboards.
 */
router.get('/livez', async (c) => {
  // Reuse readyz checks
  const readyzResponse = await fetch(new Request(new URL('/readyz', c.req.url)));
  const readyzData = (await readyzResponse.json()) as { checks?: Record<string, unknown> };

  // Request latency metrics
  const actions = ['calculate_pricing', 'create_order', 'get_products', 'create_payment_intent'];
  const latencies: Record<string, { count: number; avgMs: number; maxMs: number; minMs: number } | null> = {};
  for (const action of actions) {
    latencies[action] = getLatencySummary(action);
  }

  // Resource metrics
  const memoryUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();

  return c.json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    resource: {
      memory: {
        heapUsed: `${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`,
        heapTotal: `${(memoryUsage.heapTotal / 1024 / 1024).toFixed(2)}MB`,
        rss: `${(memoryUsage.rss / 1024 / 1024).toFixed(2)}MB`,
        external: `${(memoryUsage.external / 1024 / 1024).toFixed(2)}MB`,
      },
      cpu: {
        user: `${(cpuUsage.user / 1000).toFixed(2)}ms`,
        system: `${(cpuUsage.system / 1000).toFixed(2)}ms`,
      },
      node: {
        version: process.version,
        arch: process.arch,
        platform: process.platform,
        pid: process.pid,
      },
    },
    dependencies: readyzData.checks,
    latency: latencies,
    metrics: {
      // Sample of metrics from the metrics framework
      note: 'Full metrics available via metrics export endpoint (not implemented in this demo)',
    },
  }, 200);
});

/**
 * Helper function to record latency for API routes.
 * This can be imported and used in route handlers.
 */
export { recordLatency };

export { router as healthRouter };
