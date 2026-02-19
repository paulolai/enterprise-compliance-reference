import { describe, it, expect, beforeEach } from 'vitest';
import { TestTracer } from './modules/tracer';

describe('Tracer Integration: File Operations & Persistence', () => {
  let testTracer: TestTracer;
  
  beforeEach(() => {
    testTracer = new TestTracer({ isolated: true });
    testTracer.clear();
  });

  it('persists metadata correctly to the metadata file', () => {
    const metadata = {
      name: 'Test Invariant',
      ruleReference: 'strategy.md §1',
      rule: 'Test rule description',
      tags: ['@test']
    };

    testTracer.registerInvariant(metadata);
    
    // Force reload from file
    testTracer.loadMetadata();
    
    const registered = testTracer.getInvariantMetadata().get('Test Invariant');
    expect(registered).toBeDefined();
    expect(registered?.ruleReference).toBe('strategy.md §1');
    expect(registered?.tags).toContain('@test');
  });

  it('logs interactions and allows retrieval', () => {
    const testName = 'Integration Test Scenario';
    const input = { val: 1 };
    const output = { res: 2 };

    testTracer.log(testName, input, output);
    
    const traces = testTracer.get(testName);
    expect(traces).toHaveLength(1);
    expect(traces[0].input).toEqual(input);
    expect(traces[0].output).toEqual(output);
  });

  it('limits logs per test to avoid massive files (Sampling)', () => {
    const testName = 'Limited Test';
    
    // Try to log 10 times
    for (let i = 0; i < 10; i++) {
      testTracer.log(testName, { i }, { i });
    }
    
    const traces = testTracer.get(testName);
    // Should be capped at 5 (default maxLogsPerTest)
    expect(traces.length).toBe(5);
  });

  it('tracks statistics correctly in summaries', () => {
    const testName = 'Stats Test';
    testTracer.registerInvariant({
      name: testName,
      ruleReference: '§1',
      rule: 'Test',
      tags: ['@tag1']
    });

    // Log a VIP user
    testTracer.log(testName, { user: { tenureYears: 5 }, items: [] }, { isCapped: false });
    // Log a non-VIP user
    testTracer.log(testName, { user: { tenureYears: 1 }, items: [] }, { isCapped: false });

    const summaries = testTracer.getInvariantSummaries();
    const summary = summaries.find(s => s.name === testName);
    
    expect(summary).toBeDefined();
    expect(summary?.totalRuns).toBe(2);
    expect(summary?.edgeCasesCovered.vipUsers).toBe(1);
    expect(summary?.edgeCasesCovered.nonVipUsers).toBe(1);
  });

  it('tracks tag coverage across multiple invariants', () => {
    testTracer.registerInvariant({
      name: 'Test 1',
      ruleReference: '§1',
      rule: 'Rule 1',
      tags: ['@shared', '@unique1']
    });
    testTracer.registerInvariant({
      name: 'Test 2',
      ruleReference: '§2',
      rule: 'Rule 2',
      tags: ['@shared', '@unique2']
    });

    testTracer.log('Test 1', { items: [] }, { isCapped: false });
    testTracer.log('Test 2', { items: [] }, { isCapped: false });

    const coverage = testTracer.getTagCoverage();
    const sharedTag = coverage.find(c => c.tag === '@shared');
    const uniqueTag = coverage.find(c => c.tag === '@unique1');

    expect(sharedTag?.invariants).toContain('Test 1');
    expect(sharedTag?.invariants).toContain('Test 2');
    expect(sharedTag?.totalRuns).toBe(2);

    expect(uniqueTag?.invariants).toHaveLength(1);
    expect(uniqueTag?.totalRuns).toBe(1);
  });

  it('clears data correctly', () => {
    testTracer.registerInvariant({ name: 'Clear Me', ruleReference: '§1', rule: 'Clear', tags: [] });
    testTracer.log('Clear Me', {}, {});
    
    testTracer.clear();
    
    expect(testTracer.getInvariantMetadata().size).toBe(0);
    expect(testTracer.getInvariantSummaries()).toHaveLength(0);
    expect(testTracer.getAll()).toEqual({});
  });
});
