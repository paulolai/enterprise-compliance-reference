import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { tracer } from './modules/tracer';
import AttestationReporter from './reporters/attestation-reporter';
import { File } from 'vitest';

describe('Report Generation Validation', () => {

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
    const reporter = new AttestationReporter();
    reporter.onInit();

    // Create minimal mock file structure
    const mockFiles: File[] = [{
      id: 'mock-id',
      name: 'mock.test.ts',
      filepath: '/mock/path/mock.test.ts',
      mode: 'run',
      tasks: []
    }];

    // Add a mock task
    const mockTask: any = {
      id: 'task-id',
      type: 'test',
      name: 'Mock Test Scenario',
      file: mockFiles[0],
      suite: {
        type: 'suite',
        name: 'Mock Suite',
        tasks: []
      },
      result: {
        state: 'pass',
        duration: 123
      }
    };
    
    // Link tasks
    mockFiles[0].tasks.push(mockTask.suite); // Suite at top level
    mockTask.suite.tasks.push(mockTask); // Test inside suite

    // Trigger report generation
    reporter.onFinished(mockFiles);

    // Validation
    const reportsRoot = path.resolve(process.cwd(), '../../reports');
    expect(fs.existsSync(reportsRoot)).toBe(true);

    // Get all report directories sorted by date (newest first)
    const reportDirs = fs.readdirSync(reportsRoot)
      .map(name => path.join(reportsRoot, name))
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
