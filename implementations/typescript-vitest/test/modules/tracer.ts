import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import { InvariantMetadata } from '../fixtures/invariant-helper';

export interface Interaction {
  input: any;
  output: any;
  timestamp: number;
}

// Log entry structure for append-only file
interface LogEntry {
  testName: string;
  invariantMetadata?: InvariantMetadata;
  interaction: Interaction;
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

class TestTracer {
  private tempFile: string;
  private metadataFile: string;
  private runDir: string;
  private invariantMetadatas: Map<string, InvariantMetadata> = new Map();
  private invariantSummaries: Map<string, InvariantSummary> = new Map();
  private sampleRate: number = 1.0;
  private alwaysLogTests: Set<string> = new Set();

  constructor() {
    // Check if there's already a current run ID (from another worker)
    const currentRunFile = path.join(os.tmpdir(), 'vitest-current-run-id.txt');
    let runId: string;

    if (fs.existsSync(currentRunFile)) {
      // Use existing run ID
      runId = fs.readFileSync(currentRunFile, 'utf-8').trim();
    } else {
      // Create new run ID
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      runId = `run-${timestamp}-${Math.random().toString(36).substr(2, 6)}`;
      fs.writeFileSync(currentRunFile, runId);
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
    this.invariantMetadatas.set(metadata.name, metadata);

    // Write to shared metadata file (all workers append to same file)
    const metadataEntry: MetadataEntry = {
      type: 'metadata',
      name: metadata.name,
      ruleReference: metadata.ruleReference,
      rule: metadata.rule,
      tags: metadata.tags,
      timestamp: Date.now()
    };
    fs.appendFileSync(this.metadataFile, JSON.stringify(metadataEntry) + '\n');

    // Initialize summary if not exists
    if (!this.invariantSummaries.has(metadata.name)) {
      this.invariantSummaries.set(metadata.name, {
        name: metadata.name,
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

  log(testName: string, input: any, output: any) {
    // Check if we should log based on sampling (unless always logged)
    const shouldLog = this.alwaysLogTests.has(testName) || Math.random() < this.sampleRate;
    if (!shouldLog) return;

    const entry: LogEntry = {
      testName,
      invariantMetadata: this.invariantMetadatas.get(testName),
      interaction: {
        input,
        output,
        timestamp: Date.now()
      }
    };

    // Update summary statistics
    this.updateSummary(testName, input, output);

    // Atomic append to file
    try {
      fs.appendFileSync(this.tempFile, JSON.stringify(entry) + '\n');
    } catch (e) {
      console.error('Failed to write trace:', e);
    }
  }

  get(testName: string): Interaction[] {
    const allLogs = this.readAll();
    return allLogs[testName] || [];
  }

  getAll(): Record<string, Interaction[]> {
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
    // Clear the files but keep the run directory for historical records
    // Also keep the run ID file so workers can share it
    if (fs.existsSync(this.tempFile)) {
      fs.unlinkSync(this.tempFile);
    }
    if (fs.existsSync(this.metadataFile)) {
      fs.unlinkSync(this.metadataFile);
    }
    this.invariantMetadatas.clear();
    this.invariantSummaries.clear();
    this.alwaysLogTests.clear();
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
      console.warn('Failed to load metadata:', e);
    }
  }

  /**
   * Get the run directory path (for historical records)
   */
  getRunDir(): string {
    return this.runDir;
  }

  private readAll(): Record<string, Interaction[]> {
    const data: Record<string, Interaction[]> = {};

    try {
      if (fs.existsSync(this.tempFile)) {
        const fileContent = fs.readFileSync(this.tempFile, 'utf-8');
        const lines = fileContent.split('\n');

        for (const line of lines) {
          if (!line.trim()) continue;

          try {
            const entry: LogEntry = JSON.parse(line);
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
      // Ignore errors
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
