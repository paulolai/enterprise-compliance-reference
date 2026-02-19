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

/**
 * Prometheus-formatted metric types.
 */
type PrometheusMetricType = 'counter' | 'gauge' | 'histogram' | 'summary';

/**
 * Prometheus metric metadata.
 */
interface PrometheusMetric {
  type: PrometheusMetricType;
  name: string;
  help: string;
  labels?: string[];
  values: Map<string, number | number[]>;
}

/**
 * Histogram buckets for duration metrics (milliseconds).
 */
const HISTOGRAM_BUCKETS = [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000];

/**
 * Histogram buckets for value metrics (cents).
 */
const VALUE_BUCKETS = [1000, 5000, 10000, 25000, 50000, 100000, 250000, 500000, 1000000];

class Metrics {
  private static instance: Metrics;

  // In-memory storage for demonstration
  private counters: Map<string, number> = new Map();
  private histograms: Map<string, number[]> = new Map();
  private gauges: Map<string, number> = new Map();

  // Prometheus metric definitions
  private prometheusMetrics: Map<string, PrometheusMetric> = new Map();

  // Register metrics on initialization
  private constructor() {
    this.registerPrometheusMetrics();
  }

  private registerPrometheusMetrics(): void {
    // Counters
    this.prometheusMetrics.set('http_requests_total', {
      type: 'counter',
      name: 'http_requests_total',
      help: 'Total HTTP requests',
      labels: ['method', 'path', 'status'],
      values: new Map(),
    });

    this.prometheusMetrics.set('cart_additions_total', {
      type: 'counter',
      name: 'cart_additions_total',
      help: 'Total cart additions',
      labels: ['userId'],
      values: new Map(),
    });

    this.prometheusMetrics.set('checkouts_started_total', {
      type: 'counter',
      name: 'checkouts_started_total',
      help: 'Total checkouts started',
      labels: ['userId'],
      values: new Map(),
    });

    this.prometheusMetrics.set('checkouts_completed_total', {
      type: 'counter',
      name: 'checkouts_completed_total',
      help: 'Total checkouts completed',
      labels: ['userId'],
      values: new Map(),
    });

    // Histograms
    this.prometheusMetrics.set('checkout_value_cents', {
      type: 'histogram',
      name: 'checkout_value_cents',
      help: 'Checkout value distribution in cents',
      labels: ['userId'],
      values: new Map(),
    });

    this.prometheusMetrics.set('request_duration_ms', {
      type: 'histogram',
      name: 'request_duration_ms',
      help: 'Request duration in milliseconds',
      labels: ['action'],
      values: new Map(),
    });

    this.prometheusMetrics.set('pricing_calculation_ms', {
      type: 'histogram',
      name: 'pricing_calculation_ms',
      help: 'Pricing calculation duration in milliseconds',
      labels: ['itemCount'],
      values: new Map(),
    });

    // Gauges
    this.prometheusMetrics.set('active_users', {
      type: 'gauge',
      name: 'active_users',
      help: 'Number of active users',
      labels: [],
      values: new Map(),
    });

    this.prometheusMetrics.set('db_connections', {
      type: 'gauge',
      name: 'db_connections',
      help: 'Number of database connections',
      labels: [],
      values: new Map(),
    });
  }

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

    // Update Prometheus metric
    const promMetric = this.prometheusMetrics.get(name);
    if (promMetric && promMetric.type === 'counter') {
      promMetric.values.set(key, current + value);
    }

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

    // Update Prometheus metric
    const promMetric = this.prometheusMetrics.get(name);
    if (promMetric && promMetric.type === 'histogram') {
      promMetric.values.set(key, [...(promMetric.values.get(key) as number[] || []), value]);
    }

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

    // Update Prometheus metric
    const promMetric = this.prometheusMetrics.get(name);
    if (promMetric && promMetric.type === 'gauge') {
      promMetric.values.set(key, value);
    }

    // In prod: client.gauge(name, value, labels)
  }

  /**
   * Export metrics in Prometheus format.
   *
   * Returns a string in Prometheus exposition format that can be scraped by
   * Prometheus or other monitoring systems.
   *
   * @example
   * ```ts
   * app.get('/metrics', (c) => {
   *   return c.text(metrics.exportPrometheus());
   * });
   * ```
   */
  exportPrometheus(): string {
    const lines: string[] = [];

    // Add process info (useful for identifying the instance)
    lines.push('# HELP process_id Process identifier');
    lines.push('# TYPE process_id gauge');
    lines.push(`process_id ${process.pid}`);
    lines.push('# HELP process_uptime_seconds Process uptime in seconds');
    lines.push('# TYPE process_uptime_seconds gauge');
    lines.push(`process_uptime_seconds ${process.uptime()}`);

    // Export counters
    for (const [name, metric] of this.prometheusMetrics.entries()) {
      if (metric.type !== 'counter') continue;

      lines.push(`# HELP ${name} ${metric.help}`);
      lines.push(`# TYPE ${name} counter`);

      for (const [labelKey, value] of metric.values.entries()) {
        lines.push(`${name}${labelKey} ${value}`);
      }
      if (metric.values.size === 0) {
        lines.push(`${name} 0`);
      }
      lines.push('');
    }

    // Export gauges
    for (const [name, metric] of this.prometheusMetrics.entries()) {
      if (metric.type !== 'gauge') continue;

      lines.push(`# HELP ${name} ${metric.help}`);
      lines.push(`# TYPE ${name} gauge`);

      for (const [labelKey, value] of metric.values.entries()) {
        lines.push(`${name}${labelKey} ${value}`);
      }
      if (metric.values.size === 0) {
        lines.push(`${name} 0`);
      }
      lines.push('');
    }

    // Export histograms
    for (const [name, metric] of this.prometheusMetrics.entries()) {
      if (metric.type !== 'histogram') continue;

      lines.push(`# HELP ${name} ${metric.help}`);
      lines.push(`# TYPE ${name} histogram`);

      // Calculate buckets for each label combination
      for (const [labelKey, rawValues] of metric.values.entries()) {
        const values = Array.isArray(rawValues) ? rawValues : [rawValues];
        const sortedValues = [...values].sort((a, b) => a - b);

        const buckets = name.includes('_cents') ? VALUE_BUCKETS : HISTOGRAM_BUCKETS;

        for (const bucket of buckets) {
          const count = sortedValues.filter((v: number) => v <= bucket).length;
          lines.push(`${name}_bucket${labelKey} {le="${bucket}"} ${count}`);
        }
        lines.push(`${name}_bucket${labelKey} {le="+Inf"} ${sortedValues.length}`);
        lines.push(`${name}_sum${labelKey} ${sortedValues.reduce((a: number, b: number) => a + b, 0)}`);
        lines.push(`${name}_count${labelKey} ${sortedValues.length}`);
      }

      if (metric.values.size === 0) {
        const buckets = name.includes('_cents') ? VALUE_BUCKETS : HISTOGRAM_BUCKETS;
        for (const bucket of buckets) {
          lines.push(`${name}_bucket{le="${bucket}"} 0`);
        }
        lines.push(`${name}_bucket{le="+Inf"} 0`);
        lines.push(`${name}_sum 0`);
        lines.push(`${name}_count 0`);
      }
      lines.push('');
    }

    return lines.join('\n') + '\n';
  }

  private getKey(name: string, labels: MetricLabels): string {
    const labelStr = Object.entries(labels)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
    return labelStr ? `{${labelStr}}` : '';
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
  /**
   * Export all metrics in Prometheus format.
   *
   * This endpoint can be scraped by Prometheus or queried by other monitoring tools.
   */
  exportPrometheus: (): string => {
    return instance.exportPrometheus();
  },
};
