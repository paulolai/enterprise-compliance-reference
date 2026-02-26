import { Hono } from 'hono';
import { isStripeConfigured } from '../../lib/env';
import { sqlite } from '../../db';
import Stripe from 'stripe';

const router = new Hono();

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
 * GET /health
 * Simple liveness probe - returns 200 if the app is running.
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
 */
router.get('/readyz', async (c) => {
  const checks: Record<string, { status: 'healthy' | 'unhealthy'; message?: string }> = {};

  // Database connectivity check
  try {
    sqlite.prepare('SELECT 1').get();
    checks.database = { status: 'healthy' };
  } catch (error) {
    checks.database = {
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }

  // Stripe API check
  if (isStripeConfigured) {
    try {
      const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
      if (stripeSecretKey) {
        const stripe = new Stripe(stripeSecretKey, {
          apiVersion: '2025-12-15.clover',
        });
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

  const allHealthy = Object.values(checks).every((check) => check.status === 'healthy');
  const statusCode = allHealthy ? 200 : 503;

  return c.json({
    status: allHealthy ? 'ready' : 'not ready',
    timestamp: new Date().toISOString(),
    checks,
  }, statusCode);
});

/**
 * GET /livez
 * Detailed health status including latency bucketing and resource metrics.
 */
router.get('/livez', async (c) => {
  // Reuse readiness checks logic (simplified for inline)
  // In a real router, we might extract the check logic to a service function to avoid duplication or HTTP calls
  // For now, we'll just re-run the checks manually as in readyz to avoid self-fetch overhead
  const checks: Record<string, { status: 'healthy' | 'unhealthy'; message?: string }> = {};
  
  try {
    sqlite.prepare('SELECT 1').get();
    checks.database = { status: 'healthy' };
  } catch (error) {
    checks.database = { status: 'unhealthy', message: error instanceof Error ? error.message : 'Error' };
  }

  // Latency metrics
  const actions = ['calculate_pricing', 'create_order', 'get_products', 'create_payment_intent'];
  const latencies: Record<string, { count: number; avgMs: number; maxMs: number; minMs: number } | null> = {};
  for (const action of actions) {
    latencies[action] = getLatencySummary(action);
  }

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
      },
      cpu: {
        user: `${(cpuUsage.user / 1000).toFixed(2)}ms`,
        system: `${(cpuUsage.system / 1000).toFixed(2)}ms`,
      },
    },
    dependencies: checks,
    latency: latencies,
  }, 200);
});

export { recordLatency };
export { router as healthRouter };
