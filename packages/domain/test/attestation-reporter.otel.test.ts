import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import AttestationReporter from './reporters/attestation-reporter';
import { verifyInvariant } from './fixtures/invariant-helper';
import { getInvariantProcessor } from '@executable-specs/shared/modules/otel-setup';
import type { RunnerTask } from 'vitest';

describe('Attestation Reporter with Real OTel Data', () => {
  let tempDir: string;
  let reporter: AttestationReporter;
  const runDir = path.join(os.tmpdir(), 'vitest-otel-data');

  beforeAll(() => {
    // Ensure runDir exists
    if (!fs.existsSync(runDir)) {
      fs.mkdirSync(runDir, { recursive: true });
    }
  });

  afterEach(() => {
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    const processor = getInvariantProcessor();
    if (processor) {
      processor.clear();
    }
    // Don't delete runDir — the InvariantSpanProcessor needs it to persist
    // Just clean up the files
    if (fs.existsSync(runDir)) {
      const files = fs.readdirSync(runDir);
      for (const file of files) {
        fs.unlinkSync(path.join(runDir, file));
      }
    }
    delete process.env.ATTESTATION_REPORT_DIR;
  });

  function persistOtelDataToDisk() {
    const processor = getInvariantProcessor();
    if (!processor) return;

    if (!fs.existsSync(runDir)) {
      fs.mkdirSync(runDir, { recursive: true });
    }

    const metadata = processor.getMetadata();
    const summaries = processor.getSummaries();

    const metadataEntries = Array.from(metadata.entries()).map(([name, data]) => ({
      name,
      ...data
    }));
    fs.writeFileSync(path.join(runDir, 'metadata-1.json'), JSON.stringify(metadataEntries, null, 2));
    fs.writeFileSync(path.join(runDir, 'summaries-1.json'), JSON.stringify(summaries, null, 2));
  }

  function findReportDir(): string {
    if (!fs.existsSync(tempDir)) return '';
    const entries = fs.readdirSync(tempDir);
    const dirs = entries.filter(e => fs.statSync(path.join(tempDir, e)).isDirectory());
    return dirs.length > 0 ? path.join(tempDir, dirs[0]) : '';
  }

  function createMockModule(testName: string): unknown {
    return {
      moduleId: '/test/pricing.properties.test.ts',
      type: 'module',
      tasks: [
        {
          id: 'suite-1',
          name: 'Pricing Properties',
          type: 'suite',
          tasks: [
            {
              id: 'test-1',
              name: testName,
              type: 'test',
              result: { state: 'passed', duration: 42 },
            } as RunnerTask,
          ],
        } as RunnerTask,
      ],
    };
  }

  it('generates report with real OTel data from verifyInvariant', () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'attestation-test-'));
    process.env.ATTESTATION_REPORT_DIR = tempDir;

    const testName = 'generates report with real OTel data from verifyInvariant';
    verifyInvariant(
      {
        name: testName,
        ruleReference: 'pricing-strategy.md §2 - VIP Discount',
        rule: 'Users with tenure > 2 years get 5% discount',
        tags: ['@pricing', '@vip'],
      },
      (items, user, result) => {
        if (user.tenureYears > 2) {
          expect(result.totalDiscount).toBeGreaterThan(0);
        }
      }
    );

    const processor = getInvariantProcessor();
    expect(processor).not.toBeNull();
    expect(processor!.getSummaries().length).toBeGreaterThan(0);

    persistOtelDataToDisk();

    reporter = new AttestationReporter();
    reporter.onInit(null as any);

    const mockModule = createMockModule(testName);
    (reporter as any).onTestModuleCollected(mockModule);
    (reporter as any).onTestRunEnd([], [], 'pass');

    const reportDir = findReportDir();
    expect(reportDir).not.toBe('');

    const files = fs.readdirSync(reportDir);
    expect(files.some(f => f.endsWith('.html'))).toBe(true);

    const htmlFile = files.find(f => f.endsWith('-full.html'));
    expect(htmlFile).toBeDefined();

    const htmlContent = fs.readFileSync(path.join(reportDir, htmlFile!), 'utf-8');
    expect(htmlContent).toContain('pricing-strategy.md §2 - VIP Discount');
    expect(htmlContent).toContain('Users with tenure > 2 years get 5% discount');
    expect(htmlContent).toContain('QA Attestation');
  });

  it('report contains correct invariant count from OTel spans', () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'attestation-count-'));
    process.env.ATTESTATION_REPORT_DIR = tempDir;

    const testName = 'report contains correct invariant count from OTel spans';
    verifyInvariant(
      {
        name: testName,
        ruleReference: 'pricing-strategy.md §1 - Base Rules',
        rule: 'Final Total must never exceed Original Total',
        tags: ['@pricing', '@base-rules'],
      },
      (items, user, result) => {
        expect(result.finalTotal).toBeLessThanOrEqual(result.originalTotal);
      }
    );

    const processor = getInvariantProcessor();
    const summaries = processor!.getSummaries();
    const expectedCount = summaries.length;

    persistOtelDataToDisk();

    reporter = new AttestationReporter();
    reporter.onInit(null as any);

    const mockModule = createMockModule(testName);
    (reporter as any).onTestModuleCollected(mockModule);
    (reporter as any).onTestRunEnd([], [], 'pass');

    const reportDir = findReportDir();
    expect(reportDir).not.toBe('');

    const files = fs.readdirSync(reportDir);
    const htmlFile = files.find(f => f.endsWith('-full.html'));
    expect(htmlFile).toBeDefined();

    const htmlContent = fs.readFileSync(path.join(reportDir, htmlFile!), 'utf-8');
    expect(htmlContent).toContain('Trace #');
    expect(htmlContent).toContain('Trace #2');
  });

  it('report contains rule references from spans', () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'attestation-rules-'));
    process.env.ATTESTATION_REPORT_DIR = tempDir;

    const testName = 'report contains rule references from spans';
    verifyInvariant(
      {
        name: testName,
        ruleReference: 'pricing-strategy.md §4 - Safety Valve',
        rule: 'Total discount strictly NEVER exceeds 30% of Original Total',
        tags: ['@pricing', '@safety-valve', '@critical'],
      },
      (items, user, result) => {
        const maxDiscount = result.originalTotal * 0.3;
        expect(result.totalDiscount).toBeLessThanOrEqual(maxDiscount);
      }
    );

    persistOtelDataToDisk();

    reporter = new AttestationReporter();
    reporter.onInit(null as any);

    const mockModule = createMockModule(testName);
    (reporter as any).onTestModuleCollected(mockModule);
    (reporter as any).onTestRunEnd([], [], 'pass');

    const reportDir = findReportDir();
    expect(reportDir).not.toBe('');

    const files = fs.readdirSync(reportDir);
    const htmlFile = files.find(f => f.endsWith('-full.html'));
    expect(htmlFile).toBeDefined();

    const htmlContent = fs.readFileSync(path.join(reportDir, htmlFile!), 'utf-8');
    expect(htmlContent).toContain('pricing-strategy.md §4 - Safety Valve');
    expect(htmlContent).toContain('Total discount strictly NEVER exceeds 30% of Original Total');
    expect(htmlContent).toContain('tag-critical');
  });

  it('report contains trace data when includeTraces is true', () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'attestation-traces-'));
    process.env.ATTESTATION_REPORT_DIR = tempDir;

    const testName = 'report contains trace data when includeTraces is true';
    verifyInvariant(
      {
        name: testName,
        ruleReference: 'pricing-strategy.md §5 - Shipping',
        rule: 'Orders over $100 qualify for free standard shipping',
        tags: ['@shipping', '@free-shipping'],
      },
      (items, user, result) => {
        if (result.originalTotal > 10000) {
          expect(result.shipment.isFreeShipping).toBe(true);
        }
      }
    );

    persistOtelDataToDisk();

    reporter = new AttestationReporter();
    reporter.onInit(null as any);

    const mockModule = createMockModule(testName);
    (reporter as any).onTestModuleCollected(mockModule);
    (reporter as any).onTestRunEnd([], [], 'pass');

    const reportDir = findReportDir();
    expect(reportDir).not.toBe('');

    const files = fs.readdirSync(reportDir);
    const htmlFile = files.find(f => f.endsWith('-full.html'));
    expect(htmlFile).toBeDefined();

    const htmlContent = fs.readFileSync(path.join(reportDir, htmlFile!), 'utf-8');
    expect(htmlContent).toContain('Trace #');
    expect(htmlContent).toContain('View Details');
    expect(htmlContent).toContain('business-rule-box');
  });
});
