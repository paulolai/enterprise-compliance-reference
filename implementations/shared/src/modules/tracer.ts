// Shared tracer interface and implementation for test observability

export interface Interaction<TInput = unknown, TOutput = unknown> {
  input: TInput;
  output: TOutput;
  timestamp: number;
}

export interface InvariantMetadata {
  name: string;
  ruleReference: string;
  rule: string;
  tags: string[];
}

// Summary structure for attestation reports
export interface InvariantSummary {
  name: string;
  ruleReference: string;
  rule: string;
  tags: string[];
  totalRuns: number;
  passed: boolean;
  failureReason?: string;
  edgeCasesCovered: {
    vipUsers: number;
    nonVipUsers: number;
    exactlyTwoYearTenure: number;
    bulkItems: number;
    nonBulkItems: number;
    freeShippingQualifying: number;
    freeShippingNotQualifying: number;
    discountCapHit: number;
    expressShipping: number;
    expeditedShipping: number;
  };
}

export interface Tracer {
  log(testName: string, input: any, output: any): void;
}

// Base TestTracer class without filesystem dependencies
// Implementations can extend this for file persistence
export class TestTracer<TInput = unknown, TOutput = unknown> {
  protected invariantMetadatas: Map<string, InvariantMetadata> = new Map();
  protected invariantSummaries: Map<string, InvariantSummary> = new Map();
  protected sampleRate: number = 1.0;
  protected alwaysLogTests: Set<string> = new Set();
  protected logCounts: Map<string, number> = new Map();
  protected maxLogsPerTest: number = 5;

  /**
   * Register invariant metadata for attestation reporting
   */
  registerInvariant(metadata: InvariantMetadata) {
    const name = metadata.name || 'unnamed-invariant-' + Date.now();
    this.invariantMetadatas.set(name, metadata);

    // Initialize summary if not exists
    if (!this.invariantSummaries.has(name)) {
      this.invariantSummaries.set(name, {
        name,
        ruleReference: metadata.ruleReference,
        rule: metadata.rule,
        tags: metadata.tags,
        totalRuns: 0,
        passed: true,
        edgeCasesCovered: {
          vipUsers: 0,
          nonVipUsers: 0,
          exactlyTwoYearTenure: 0,
          bulkItems: 0,
          nonBulkItems: 0,
          freeShippingQualifying: 0,
          freeShippingNotQualifying: 0,
          discountCapHit: 0,
          expressShipping: 0,
          expeditedShipping: 0
        }
      });
    }
  }

  /**
   * Configure sampling rate for efficiency
   */
  setSampleRate(rate: number) {
    this.sampleRate = Math.max(0, Math.min(1, rate));
  }

  /**
   * Always log specific critical invariants regardless of sampling
   */
  alwaysLog(testName: string) {
    this.alwaysLogTests.add(testName);
  }

  /**
   * Log an interaction for a specific test
   * Override in subclass for persistence
   */
  log(testName: string, input: TInput, output: TOutput): void {
    let currentCount = this.logCounts.get(testName) || 0;

    // Always log if explicitly requested, or if we haven't hit the limit yet
    const shouldLog = this.alwaysLogTests.has(testName) || currentCount < this.maxLogsPerTest;

    if (!shouldLog) return;

    this.logCounts.set(testName, currentCount + 1);

    // Update summary statistics
    this.updateSummary(testName, input, output);
  }

  /**
   * Get all registered invariant metadata
   */
  getInvariantMetadata(): Map<string, InvariantMetadata> {
    return this.invariantMetadatas;
  }

  /**
   * Get invariant summaries for attestation reports
   */
  getInvariantSummaries(): InvariantSummary[] {
    return Array.from(this.invariantSummaries.values());
  }

  markFailed(testName: string, reason: string) {
    const summary = this.invariantSummaries.get(testName);
    if (summary) {
      summary.passed = false;
      summary.failureReason = reason;
    }
  }

  clear() {
    this.invariantMetadatas.clear();
    this.invariantSummaries.clear();
    this.alwaysLogTests.clear();
    this.logCounts.clear();
  }

  /**
   * Update invariant summary statistics based on test execution
   */
  protected updateSummary(testName: string, input: any, output: any) {
    const summary = this.invariantSummaries.get(testName);
    if (!summary) return;

    summary.totalRuns++;

    // Extract data for statistics
    const user = input.user || { tenureYears: 0 };
    const items = input.items || [];
    const method = input.shippingMethod || input.method;

    // Track VIP vs non-VIP
    if (user.tenureYears > 2) {
      summary.edgeCasesCovered.vipUsers++;
    } else {
      summary.edgeCasesCovered.nonVipUsers++;
    }

    // Track exactly 2 years boundary
    if (user.tenureYears === 2) {
      summary.edgeCasesCovered.exactlyTwoYearTenure++;
    }

    // Track bulk vs non-bulk items
    items.forEach((item: any) => {
      if (item.quantity >= 3) {
        summary.edgeCasesCovered.bulkItems++;
      } else {
        summary.edgeCasesCovered.nonBulkItems++;
      }
    });

    // Track free shipping
    if (output.shipment?.isFreeShipping) {
      summary.edgeCasesCovered.freeShippingQualifying++;
    } else {
      summary.edgeCasesCovered.freeShippingNotQualifying++;
    }

    // Track discount cap
    if (output.isCapped) {
      summary.edgeCasesCovered.discountCapHit++;
    }

    // Track shipping methods
    if (method === 'EXPRESS') {
      summary.edgeCasesCovered.expressShipping++;
    } else if (method === 'EXPEDITED') {
      summary.edgeCasesCovered.expeditedShipping++;
    }
  }
}

// Simple in-memory tracer instance for shared use
export const tracer = new TestTracer();
