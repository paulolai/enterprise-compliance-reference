import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { tracer } from './modules/tracer';
import AttestationReporter from './reporters/attestation-reporter';
import { RunnerTestFile } from 'vitest';
import os from 'os';

describe('Report Generation Validation', () => {
  let tempDir: string;

  afterEach(() => {
    // Cleanup
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    delete process.env.ATTESTATION_REPORT_DIR;
  });

  it('Metadata is registered correctly for invariants', () => {
    // Register some test metadata
    tracer.registerInvariant({
      name: 'Test Invariant',
      ruleReference: 'pricing-strategy.md §1 - Base Rules',
      rule: 'Test rule description',
      tags: ['@test', '@validation']
    });

    // Verify metadata is in the map
    const metadata = tracer.getInvariantMetadata().get('Test Invariant');
    expect(metadata).toBeDefined();
    expect(metadata?.ruleReference).toBe('pricing-strategy.md §1 - Base Rules');
    expect(metadata?.rule).toBe('Test rule description');
    expect(metadata?.tags).toEqual(['@test', '@validation']);
  });

  it('Traces can be logged and retrieved', () => {
    const testName = expect.getState().currentTestName!;
    const input = { items: [], user: {} };
    const output = { originalTotal: 0, finalTotal: 0 };

    // Log a trace
    tracer.log(testName, input, output);

    // Verify trace can be retrieved
    const traces = tracer.get(testName);
    expect(traces.length).toBeGreaterThan(0);

    // Verify trace content
    const trace = traces[0];
    expect(trace).toBeDefined();
    expect(trace.input).toEqual(input);
    expect(trace.output).toEqual(output);
    expect(trace.timestamp).toBeDefined();
  });

  it('Generates a valid report artifact', () => {
    // Setup temp dir for reports
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vitest-reports-'));
    process.env.ATTESTATION_REPORT_DIR = tempDir;

    const reporter = new AttestationReporter();
    reporter.onInit(null as any);

    // Create minimal mock module structure (Vitest v3/v4 TestModule format)
    const mockModule: any = {
      moduleId: 'mock.test.ts',
      type: 'module',
      name: 'mock.test.ts',
      // Nested task structure: Module -> Suite -> Test
      tasks: [
        {
          type: 'suite',
          name: 'Mock Suite',
          id: 'suite-id',
          result: { state: 'passed' },
          tasks: [
            {
              type: 'test',
              name: 'Mock Test Scenario',
              id: 'task-id',
              result: {
                state: 'passed',
                duration: 123
              },
              parent: undefined // will be set by the traversal if needed
            }
          ]
        }
      ]
    };

    // Set parent reference for the test task
    mockModule.tasks[0].tasks[0].parent = mockModule.tasks[0];
    mockModule.tasks[0].parent = mockModule;

    // Call onTestModuleCollected to register the mock module
    (reporter as any).onTestModuleCollected(mockModule);

    // Register metadata for the mock test
    tracer.registerInvariant({
      name: 'Mock Test Scenario',
      ruleReference: 'test-reference.md §1',
      rule: 'Mock rule for testing',
      tags: ['@test']
    });

    // Trigger report generation
    (reporter as any).onTestRunEnd([], [], 'passed');

    // Validation
    // Get all report directories sorted by date (newest first)
    const reportDirs = fs.readdirSync(tempDir)
      .map(name => path.join(tempDir, name))
      .filter(fullPath => fs.statSync(fullPath).isDirectory())
      .sort((a, b) => {
        const statA = fs.statSync(a);
        const statB = fs.statSync(b);
        return statB.mtime.getTime() - statA.mtime.getTime();
      });

    expect(reportDirs.length).toBeGreaterThan(0);

    const latestReport = reportDirs[0];
    const attestationFull = path.join(latestReport, 'attestation-full.html');

    expect(fs.existsSync(attestationFull)).toBe(true);

    const html = fs.readFileSync(attestationFull, 'utf-8');
    expect(html).toContain('QA Attestation');
    expect(html).toContain('Executive Summary');
    expect(html).toContain('Mock Test Scenario');
  });

  it('Run directory contains trace data', () => {
    // Ensure we have some data registered to create the files
    tracer.registerInvariant({
      name: 'Run Directory Test Invariant',
      ruleReference: 'internal',
      rule: 'internal',
      tags: []
    });
    tracer.log('Run Directory Test Invariant', { test: 1 }, { result: 2 });

    // Find the most recent run directory
    const runDir = tracer.getRunDir();
    const interactionsFile = path.join(runDir, 'interactions.jsonl');
    const metadataFile = path.join(runDir, 'metadata.jsonl');

    expect(fs.existsSync(interactionsFile)).toBe(true);
    expect(fs.existsSync(metadataFile)).toBe(true);

    // Verify interactions file has content
    const interactions = fs.readFileSync(interactionsFile, 'utf-8');
    expect(interactions.length).toBeGreaterThan(0);

    // Verify each line is valid JSON
    const lines = interactions.trim().split('\n');
    lines.forEach(line => {
      if (line.trim()) {
        expect(() => JSON.parse(line)).not.toThrow();
      }
    });
  });
});
