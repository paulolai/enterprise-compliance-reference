import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { tracer } from './modules/tracer';

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
    const testName = 'Test Trace';
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

  it('Report directory is created and contains expected files', () => {
    // Find the most recent report directory
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

    // Check that the latest report has expected files
    const latestReport = reportDirs[0];
    const attestationLight = path.join(latestReport, 'attestation-light.html');
    const attestationFull = path.join(latestReport, 'attestation-full.html');
    const attestationMd = path.join(latestReport, 'attestation.md');

    expect(fs.existsSync(attestationLight)).toBe(true);
    expect(fs.existsSync(attestationFull)).toBe(true);
    expect(fs.existsSync(attestationMd)).toBe(true);
  });

  it('HTML report contains expected structure', () => {
    // Find the most recent report directory
    const reportsRoot = path.resolve(process.cwd(), '../../reports');
    const reportDirs = fs.readdirSync(reportsRoot)
      .map(name => path.join(reportsRoot, name))
      .filter(fullPath => fs.statSync(fullPath).isDirectory())
      .sort((a, b) => {
        const statA = fs.statSync(a);
        const statB = fs.statSync(b);
        return statB.mtime.getTime() - statA.mtime.getTime();
      });

    const latestReport = reportDirs[0];
    const attestationFull = path.join(latestReport, 'attestation-full.html');

    const html = fs.readFileSync(attestationFull, 'utf-8');

    // Verify HTML contains expected elements
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<html>');
    expect(html).toContain('<body>');
    expect(html).toContain('QA Attestation');
    expect(html).toContain('Executive Summary');
    expect(html).toContain('Detailed Audit Log');
  });

  it('Run directory contains trace data', () => {
    // Find the most recent run directory
    const runDir = tracer.getRunDir();
    const interactionsFile = path.join(runDir, 'interactions.jsonl');
    const metadataFile = path.join(runDir, 'metadata.jsonl');
    const currentRunFile = path.join('/tmp', 'vitest-current-run-id.txt');

    expect(fs.existsSync(interactionsFile)).toBe(true);
    expect(fs.existsSync(metadataFile)).toBe(true);
    expect(fs.existsSync(currentRunFile)).toBe(true);

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
