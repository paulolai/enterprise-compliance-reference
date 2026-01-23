/**
 * Metrics Framework
 *
 * Provides a simple interface for collecting application metrics.
 * In a real production environment, this would likely interface with
 * Prometheus, Datadog, or similar monitoring systems.
 *
 * @see PRODUCTION_READY_PLAN.md Part 3.3: Metrics Framework
 */

interface MetricLabels {
  [key: string]: string | number;
}

class Metrics {
  private static instance: Metrics;
  
  // In-memory storage for demonstration (would be flushed to collector in prod)
  private counters: Map<string, number> = new Map();
  private histograms: Map<string, number[]> = new Map();
  private gauges: Map<string, number> = new Map();

  private constructor() {}

  static getInstance(): Metrics {
    if (!Metrics.instance) {
      Metrics.instance = new Metrics();
    }
    return Metrics.instance;
  }

  /**
   * Increment a counter
   * @param name Metric name
   * @param value Amount to increment by (default 1)
   * @param labels Optional labels for dimensions
   */
  increment(name: string, value: number = 1, labels: MetricLabels = {}): void {
    const key = this.getKey(name, labels);
    const current = this.counters.get(key) || 0;
    this.counters.set(key, current + value);
    
    // In prod: client.increment(name, value, labels)
  }

  /**
   * Record a value in a histogram (distribution)
   * @param name Metric name
   * @param value Value to record
   * @param labels Optional labels
   */
  histogram(name: string, value: number, labels: MetricLabels = {}): void {
    const key = this.getKey(name, labels);
    const values = this.histograms.get(key) || [];
    values.push(value);
    this.histograms.set(key, values);
    
    // In prod: client.histogram(name, value, labels)
  }

  /**
   * Set a gauge value
   * @param name Metric name
   * @param value Value to set
   * @param labels Optional labels
   */
  gauge(name: string, value: number, labels: MetricLabels = {}): void {
    const key = this.getKey(name, labels);
    this.gauges.set(key, value);
    
    // In prod: client.gauge(name, value, labels)
  }

  private getKey(name: string, labels: MetricLabels): string {
    const labelStr = Object.entries(labels)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([k, v]) => `${k}=${v}`)
      .join(',');
    return labelStr ? `${name}{${labelStr}}` : name;
  }
}

const instance = Metrics.getInstance();

export const metrics = {
  counter: {
    httpRequestsTotal: (method: string, path: string, status: number) => {
      instance.increment('http_requests_total', 1, { method, path, status });
    },
    cartAdditions: (userId: string = 'anonymous') => {
      instance.increment('cart_additions_total', 1, { userId });
    },
    checkoutsStarted: (userId: string = 'anonymous') => {
      instance.increment('checkouts_started_total', 1, { userId });
    },
    checkoutsCompleted: (userId: string = 'anonymous', valueInCents: number) => {
      instance.increment('checkouts_completed_total', 1, { userId });
      instance.histogram('checkout_value_cents', valueInCents, { userId });
    },
  },
  histogram: {
    requestDuration: (action: string, durationMs: number) => {
      instance.histogram('request_duration_ms', durationMs, { action });
    },
    pricingCalculationTime: (itemCount: number, durationMs: number) => {
      instance.histogram('pricing_calculation_ms', durationMs, { itemCount });
    },
  },
  gauge: {
    activeUsers: (count: number) => {
      instance.gauge('active_users', count);
    },
    databaseConnections: (count: number) => {
      instance.gauge('db_connections', count);
    },
  },
};
