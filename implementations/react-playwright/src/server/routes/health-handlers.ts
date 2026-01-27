import type { Context } from 'hono';
import { isStripeConfigured } from '../../lib/env';
import { db } from '@executable-specs/shared/index-server';
import Stripe from 'stripe';

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
 * GET /readyz
 * Readiness probe with dependency checks.
 * Used by Kubernetes to determine if the pod can receive traffic.
 */
export const getReadyzHandler = async (c: Context) => {
  const checks: Record<string, { status: 'healthy' | 'unhealthy'; message?: string }> = {};

  // Database connectivity check
  try {
    // Use a simple SELECT 1 via raw query for connection test
    await db.$client.prepare('SELECT 1').get();
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
};

/**
 * GET /livez
 * Detailed health status including latency bucketing and resource metrics.
 * Provides comprehensive health information for monitoring dashboards.
 */
export const getLivezHandler = async (c: Context) => {
  // Inline the readiness checks instead of making a self-referential fetch
  const checks: Record<string, { status: 'healthy' | 'unhealthy'; message?: string }> = {};

  // Database connectivity check
  try {
    // Use a simple SELECT 1 via raw query for connection test
    await db.$client.prepare('SELECT 1').get();
    checks.database = { status: 'healthy' };
  } catch (error) {
    checks.database = {
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }

  // Stripe API check
  if (isStripeConfigured) {
    checks.stripe = { status: 'healthy', message: 'Configured' };
  } else {
    checks.stripe = { status: 'healthy', message: 'Not configured' };
  }

  // Memory check
  const memoryUsage = process.memoryUsage();
  const memoryRatio = memoryUsage.heapUsed / memoryUsage.heapTotal;
  checks.memory = {
    status: memoryRatio > 0.9 ? 'unhealthy' : 'healthy',
    message: `${(memoryRatio * 100).toFixed(1)}% used`,
  };

  // Request latency metrics
  const actions = ['calculate_pricing', 'create_order', 'get_products', 'create_payment_intent'];
  const latencies: Record<string, { count: number; avgMs: number; maxMs: number; minMs: number } | null> = {};
  for (const action of actions) {
    latencies[action] = getLatencySummary(action);
  }

  // CPU metrics
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
    dependencies: checks,
    latency: latencies,
    metrics: {
      note: 'Full metrics available via metrics export endpoint (not implemented in this demo)',
    },
  }, 200);
};

/**
 * Helper function to record latency for API routes.
 * This can be imported and used in route handlers.
 */
export { recordLatency };
