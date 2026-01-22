import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type { InvariantMetadata } from '../fixtures/invariant-helper';

export interface Interaction<TInput = unknown, TOutput = unknown> {
  input: TInput;
  output: TOutput;
  timestamp: number;
}

// Log entry structure for append-only file
interface LogEntry<TInput = unknown, TOutput = unknown> {
  testName: string;
  invariantMetadata?: InvariantMetadata;
  interaction: Interaction<TInput, TOutput>;
}

// Separate file for metadata registry
interface MetadataEntry {
  type: 'metadata';
  name: string;
  ruleReference: string;
  rule: string;
  tags: string[];
  timestamp: number;
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

export interface TagCoverage {
  tag: string;
  invariants: string[];
  totalRuns: number;
  passed: boolean;
}

export class TestTracer<TInput = unknown, TOutput = unknown> {
  private tempFile: string;
  private metadataFile: string;
  private runDir: string;
  private invariantMetadatas: Map<string, InvariantMetadata> = new Map();
  private invariantSummaries: Map<string, InvariantSummary> = new Map();
  private sampleRate: number = 1.0;
  private alwaysLogTests: Set<string> = new Set();
  private logCounts: Map<string, number> = new Map();
  private maxLogsPerTest: number = 5;

  constructor(options: { isolated?: boolean } = {}) {
    // Check if there's already a current run ID (from another worker)
    const currentRunFile = path.join(os.tmpdir(), 'vitest-current-run-id.txt');
    let runId: string;

    if (!options.isolated && fs.existsSync(currentRunFile)) {
      // Use existing run ID
      runId = fs.readFileSync(currentRunFile, 'utf-8').trim();
    } else {
      // Create new run ID
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      runId = `run-${timestamp}-${Math.random().toString(36).substr(2, 6)}`;
      
      if (!options.isolated) {
        fs.writeFileSync(currentRunFile, runId);
      }
    }

    this.runDir = path.join(os.tmpdir(), `vitest-runs`, runId);

    if (!fs.existsSync(this.runDir)) {
      fs.mkdirSync(this.runDir, { recursive: true });
    }

    this.tempFile = path.join(this.runDir, 'interactions.jsonl');
    this.metadataFile = path.join(this.runDir, 'metadata.jsonl');
  }

  /**
   * Register invariant metadata for attestation reporting
   */
  registerInvariant(metadata: InvariantMetadata) {
    const name = metadata.name || 'unnamed-invariant-' + Date.now();
    this.invariantMetadatas.set(name, metadata);

    // Write to shared metadata file (all workers append to same file)
    const metadataEntry: MetadataEntry = {
      type: 'metadata',
      name,
      ruleReference: metadata.ruleReference,
      rule: metadata.rule,
      tags: metadata.tags,
      timestamp: Date.now()
    };

    try {
      fs.appendFileSync(this.metadataFile, JSON.stringify(metadataEntry) + '\n');
    } catch (e) {
      const error = e as Error;
      console.error(`[Tracer] Failed to write metadata to ${this.metadataFile}:`, {
        name,
        error: error.message
      });
    }

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
   */
  log(testName: string, input: TInput, output: TOutput): void {
    let currentCount = this.logCounts.get(testName) || 0;
    
    // Always log if explicitly requested, or if we haven't hit the limit yet
    const shouldLog = this.alwaysLogTests.has(testName) || currentCount < this.maxLogsPerTest;
    
    if (!shouldLog) return;

    this.logCounts.set(testName, currentCount + 1);

    const entry: LogEntry<TInput, TOutput> = {
      testName,
      invariantMetadata: this.invariantMetadatas.get(testName),
      interaction: {
        input,
        output,
        timestamp: Date.now()
      }
    };

    // Attach to Allure (for Unified Reporting)
    try {
      const allure = (globalThis as any).allure;
      if (allure && typeof allure.attachment === 'function') {
        allure.attachment(
          `Trace #${currentCount + 1}`,
          JSON.stringify({ input, output }, null, 2),
          'application/json'
        );
      }
    } catch (e) {
      // Ignore if not running in Allure context or other issues
    }

    // Update summary statistics
    this.updateSummary(testName, input, output);

    // Atomic append to file
    try {
      fs.appendFileSync(this.tempFile, JSON.stringify(entry) + '\n');
    } catch (e) {
      const error = e as Error;
      console.error(`[Tracer] Failed to write trace to ${this.tempFile}:`, {
        testName,
        error: error.message,
        stack: error.stack
      });
    }
  }

  /**
   * Get all interactions for a specific test
   */
  get(testName: string): Interaction<TInput, TOutput>[] {
    const allLogs = this.readAll();
    return allLogs[testName] || [];
  }

  /**
   * Get all interactions indexed by test name
   */
  getAll(): Record<string, Interaction<TInput, TOutput>[]> {
    return this.readAll();
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

  /**
   * Get tag-based coverage for living documentation
   */
  getTagCoverage(): TagCoverage[] {
    const tagsMap = new Map<string, TagCoverage>();

    for (const [name, summary] of this.invariantSummaries) {
      for (const tag of summary.tags) {
        if (!tagsMap.has(tag)) {
          tagsMap.set(tag, {
            tag,
            invariants: [],
            totalRuns: 0,
            passed: true
          });
        }

        const tagCoverage = tagsMap.get(tag)!;
        tagCoverage.invariants.push(name);
        tagCoverage.totalRuns += summary.totalRuns;
        if (!summary.passed) {
          tagCoverage.passed = false;
        }
      }
    }

    return Array.from(tagsMap.values());
  }

  clear() {
    if (fs.existsSync(this.tempFile)) {
      try {
        fs.unlinkSync(this.tempFile);
      } catch (e) {
        console.warn(`[Tracer] Failed to clear temp file ${this.tempFile}:`, (e as Error).message);
      }
    }
    if (fs.existsSync(this.metadataFile)) {
      try {
        fs.unlinkSync(this.metadataFile);
      } catch (e) {
        console.warn(`[Tracer] Failed to clear metadata file ${this.metadataFile}:`, (e as Error).message);
      }
    }
    this.invariantMetadatas.clear();
    this.invariantSummaries.clear();
    this.alwaysLogTests.clear();
    this.logCounts.clear();
  }

  /**
   * Load metadata from the shared file (called by reporter)
   */
  loadMetadata() {
    if (!fs.existsSync(this.metadataFile)) {
      return;
    }

    try {
      const fileContent = fs.readFileSync(this.metadataFile, 'utf-8');
      const lines = fileContent.split('\n');

      for (const line of lines) {
        if (!line.trim()) continue;

        try {
          const entry: MetadataEntry = JSON.parse(line);
          if (entry.type === 'metadata') {
            this.invariantMetadatas.set(entry.name, {
              name: entry.name,
              ruleReference: entry.ruleReference,
              rule: entry.rule,
              tags: entry.tags
            });
          }
        } catch (e) {
          // Ignore corrupted lines
        }
      }
    } catch (e) {
      const error = e as Error;
      console.warn(`[Tracer] Failed to load metadata from ${this.metadataFile}:`, {
        error: error.message,
        stack: error.stack
      });
    }
  }

  /**
   * Get the run directory path (for historical records)
   */
  getRunDir(): string {
    return this.runDir;
  }

  private readAll(): Record<string, Interaction<TInput, TOutput>[]> {
    const data: Record<string, Interaction<TInput, TOutput>[]> = {};

    try {
      if (fs.existsSync(this.tempFile)) {
        const fileContent = fs.readFileSync(this.tempFile, 'utf-8');
        const lines = fileContent.split('\n');

        for (const line of lines) {
          if (!line.trim()) continue;

          try {
            const entry: LogEntry<TInput, TOutput> = JSON.parse(line);
            if (!data[entry.testName]) {
              data[entry.testName] = [];
            }
            data[entry.testName].push(entry.interaction);
          } catch (e) {
            // Ignore corrupted lines
          }
        }
      }
    } catch (e) {
      const error = e as Error;
      console.warn(`[Tracer] Failed to read traces from ${this.tempFile}:`, error.message);
    }

    return data;
  }

  /**
   * Update invariant summary statistics based on test execution
   */
  private updateSummary(testName: string, input: any, output: any) {
    const summary = this.invariantSummaries.get(testName);
    if (!summary) return;

    summary.totalRuns++;

    // Extract data for statistics
    const user = input.user || { tenureYears: 0 };
    const items = input.items || [];
    const method = input.method;

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

export const tracer = new TestTracer();
