# Plan: Fix Vitest Warnings & Capture Test Intent Metadata in Reports

## Part 1: Fix Vitest CJS Deprecation Warning

### Issue
When running `npm test`, vitest displays:
```
The CJS build of Vite's Node API is deprecated. See https://vite.dev/guide/troubleshooting.html#vite-cjs-node-api-deprecated for more details.
```

### Root Cause
The `package.json` does not have `"type": "module"` set, so Node.js treats the project as CommonJS by default, even though:
- vitest.config.ts uses ESM syntax (`import`/`export`)
- Modern vitest 2.x prefers ESM mode

### Solution ✅ IMPLEMENTED
**File:** `package.json`

Added `"type": "module"` to explicitly declare ESM mode:
```json
{
  "name": "pricing-engine-ts-vitest",
  "version": "1.0.0",
  "type": "module",  // ← DONE
  "description": "Code as Specification demo implementation",
  ...
}
```

**Validation:** ✅ COMPLETE
- Run `npm test` - the CJS deprecation warning disappears
- All tests pass without warnings
- TypeScript compiles correctly with no ESM-related errors

**Status:** ✅ COMPLETED

---

## Part 2: Capture Test Intent Metadata in Reports

### Problem Statement
The inline comments in `test/preconditions.spec.ts` explain test intent (e.g., "Validates: pricing-strategy.md §2 - Bulk Discounts", "Critical boundary: quantity = 3"), but this information only exists as code comments. Business stakeholders reviewing the reports cannot see:
- Which business rule each test validates
- Why a specific edge case matters
- Tags for filtering by domain (@pricing, @shipping, @critical)

### Current Architecture
- **Tracer stores** `InvariantMetadata` (name, ruleReference, rule, tags) via `tracer.registerInvariant()`
- **Property tests** use `verifyInvariant()` helper which registers metadata
- **Precondition tests** (example tests) don't register metadata, only have code comments
- **Reporter** (attestation-reporter.ts) generates HTML showing test names + pass/fail, but needs to retrieve and display InvariantMetadata

### Solution: Multi-Phase Implementation

#### ✅ Phase 1: Create Precondition Test Metadata Helper ✅ DONE

**File:** `test/fixtures/invariant-helper.ts`

Added `registerPrecondition()` and `logPrecondition()` functions:
```typescript
export interface PreconditionMetadata {
  name: string;
  ruleReference: string; // e.g., "pricing-strategy.md §2 - Bulk Discounts"
  scenario: string; // e.g., "Critical boundary: quantity = 3 (exactly at bulk threshold)"
  tags: string[]; // e.g., ['@pricing', '@bulk-discount', '@boundary']
}

export function registerPrecondition(metadata: PreconditionMetadata) {
  tracer.registerInvariant({
    name: metadata.name,
    ruleReference: metadata.ruleReference,
    rule: metadata.scenario, // Reuse existing 'rule' field for scenario description
    tags: metadata.tags
  });
}

export function logPrecondition(testName: string, input: any, output: any) {
  tracer.log(testName, input, output);
}
```

**Status:** ✅ COMPLETED

#### ✅ Phase 2: Enhance Reporter to Display Metadata ✅ DONE

**File:** `test/reporters/attestation-reporter.ts`

Modified `renderTaskHtml()` to retrieve and display InvariantMetadata with CSS styling and Fallback lookup:
```typescript
private renderTaskHtml(task: Task, level: number, includeTraces: boolean): string {
  // ... existing code ...
  if (subTask.type === 'test') {
    const testName = getFullTestName(subTask);
    const metadata = tracer.getInvariantMetadata().get(testName);

    // Add metadata display
    let metadataHtml = '';
    if (metadata) {
      metadataHtml = `<div class="test-metadata">
        <div class="metadata-row">
          <span class="metadata-label">Business Rule:</span>
          <span class="metadata-value">${metadata.ruleReference}</span>
        </div>
        <div class="metadata-row">
          <span class="metadata-label">Scenario:</span>
          <span class="metadata-value">${metadata.rule}</span>
        </div>
        <div class="metadata-row">
          <span class="metadata-label">Tags:</span>
          <span class="tags">${metadata.tags.map(t => `<span class="tag">${t}</span>`).join(' ')}</span>
        </div>
      </div>`;
    }

    output += `<tr><td>${subTask.name}${metadataHtml}${details}</td><td class="${statusClass}">${status}</td></tr>`;
  }
}
```

Added CSS styles for metadata display:
```css
.test-metadata { font-size: 0.85em; margin-top: 8px; padding: 8px; background: #f8f9fa; border-radius: 4px; border: 1px solid #e1e4e8; }
.metadata-row { margin-bottom: 4px; }
.metadata-label { font-weight: 600; color: #666; margin-right: 6px; }
.metadata-value { color: #333; }
.tags { display: flex; flex-wrap: wrap; gap: 4px; }
.tag { background: #e1f5ff; color: #0066cc; padding: 2px 6px; border-radius: 3px; font-size: 0.9em; }
```

**Status:** ✅ COMPLETED

#### ✅ Phase 3: Handle Multi-Worker Metadata Sharing ✅ DONE

**Problem:** Vitest runs tests in multiple worker processes. Each worker has its own tracer instance, so metadata registered via `tracer.registerInvariant()` in one worker is not visible to the reporter running in a different worker.

**Solution:** File-based persistence with shared run directory

**File:** `test/modules/tracer.ts`

Enhanced to persist metadata across worker processes:
```typescript
export class Tracer {
  private runDir: string;
  private tempFile: string;
  private metadataFile: string;

  constructor() {
    const currentRunFile = path.join(os.tmpdir(), 'vitest-current-run-id.txt');
    let runId: string;

    if (fs.existsSync(currentRunFile)) {
      runId = fs.readFileSync(currentRunFile, 'utf-8').trim();
    } else {
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

  registerInvariant(metadata: InvariantMetadata) {
    this.invariantMetadatas.set(metadata.name, metadata);

    const metadataEntry: MetadataEntry = {
      type: 'metadata',
      name: metadata.name,
      ruleReference: metadata.ruleReference,
      rule: metadata.rule,
      tags: metadata.tags,
      timestamp: Date.now()
    };
    fs.appendFileSync(this.metadataFile, JSON.stringify(metadataEntry) + '\n');
  }

  loadMetadata() {
    if (!fs.existsSync(this.metadataFile)) return;

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
  }

  getRunDir(): string {
    return this.runDir;
  }
}
```

**Reporter enhancement to load persisted metadata:**
```typescript
onRunComplete(context) {
  tracer.loadMetadata(); // Load metadata from file before generating report
  // ... rest of report generation
}
```

**Status:** ✅ COMPLETED

#### ✅ Phase 4: Fix Trace Lookup for Property Tests ✅ DONE

**Problem:** Property tests logged traces using `metadata.name` (e.g., "Final Total <= Original Total") but the reporter looked up traces by full test name (e.g., "Pricing Engine: Mathematical Invariants > Invariant: Final Total is always <= Original Total"). This caused traces to not display in reports.

**Solution:** Add fallback lookup in reporter

**File:** `test/reporters/attestation-reporter.ts`
```typescript
// Try full test name first
let interactions = tracer.get(getFullTestName(subTask));

// Fallback to metadata.name (used by property tests)
if (interactions.length === 0 && metadata) {
  interactions = tracer.get(metadata.name);
}
```

**Status:** ✅ COMPLETED

#### ✅ Phase 5: Update All Precondition Tests ✅ DONE

**File:** `test/preconditions.spec.ts`

For each of the 19 precondition tests, added `registerPrecondition()` call at the start with structured metadata:
```typescript
import { registerPrecondition, logPrecondition } from './fixtures/invariant-helper';

it('Precondition: Empty cart results in zero totals', () => {
  registerPrecondition({
    name: 'Precondition: Empty cart results in zero totals',
    ruleReference: 'pricing-strategy.md §1 - Base Rules',
    scenario: 'Edge case: Empty cart should not crash, should only charge shipping',
    tags: ['@precondition', '@boundary', '@input-validation']
  });

  // ... test code ...
  logPrecondition('Precondition: Empty cart results in zero totals', { items: emptyCart, user }, result);
});
```

**Status:** ✅ COMPLETED - All 19 tests updated

#### ✅ Phase 6: Add Traces to All Test Types ✅ DONE

**File:** `test/regression.golden-master.test.ts`

Added tracer.log() to each golden master test case:
```typescript
import { tracer } from './modules/tracer';

goldenMasterCases.forEach((testCase, index) => {
  it(`GM${String(index + 1).padStart(3, '0')}: ${testCase.name}`, () => {
    const result = PricingEngine.calculate(testCase.cart, testCase.user, testCase.method);
    const testName = `GM${String(index + 1).padStart(3, '0')}: ${testCase.name}`;
    tracer.log(testName, { items: testCase.cart, user: testCase.user, method: testCase.method }, result);
    // ... assertions
  });
});
```

**File:** `test/integration.properties.test.ts`

Added tracer.log() to each integration test:
```typescript
it('Integration: Bulk + VIP discounts combine correctly and respect cap', () => {
  const testName = 'Integration: Bulk + VIP discounts combine correctly and respect cap';
  fc.assert(fc.property(cartArb, userArb, (items, user) => {
    const result = PricingEngine.calculate(items, user);
    tracer.log(testName, { items, user }, result);
    // ... assertions
  }));
});
```

**File:** `test/fixtures/cart-builder.ts`

Already had tracer.log() in the calculate() method, so pricing.spec.ts and shipping.spec tests automatically log traces:
```typescript
calculate(testName?: string): PricingResult {
  const input = { items: this.items, user: this.user, shippingMethod: this.shippingMethod };
  const output = PricingEngine.calculate(this.items, this.user, this.shippingMethod);

  if (testName) {
    tracer.log(testName, input, output);
  }

  return output;
}
```

**Status:** ✅ COMPLETED - All test types now log traces

#### ✅ Phase 7: Add Report Validation Tests ✅ DONE

**File:** `test/report-generation.spec.ts` (Created)

Added 5 validation tests to verify report generation:
1. Metadata is registered correctly for invariants
2. Traces can be logged and retrieved
3. Report directory is created and contains expected files
4. HTML report contains expected structure
5. Run directory contains trace data

```typescript
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { tracer } from './modules/tracer';

describe('Report Generation Validation', () => {
  it('Metadata is registered correctly for invariants', () => { /* ... */ });
  it('Traces can be logged and retrieved', () => { /* ... */ });
  it('Report directory is created and contains expected files', () => { /* ... */ });
  it('HTML report contains expected structure', () => { /* ... */ });
  it('Run directory contains trace data', () => { /* ... */ });
});
```

**Status:** ✅ COMPLETED

### Benefits

1. ✅ **Report Traceability**: Business stakeholders can see exactly which pricing-strategy.md section each test validates
2. ✅ **Intent Clarity**: Scenario descriptions explain WHY each edge case matters (e.g., "Critical boundary: exactly at threshold")
3. ✅ **Tag-Based Filtering**: Tags (@pricing, @shipping, @boundary, @critical) enable filtering reports by domain
4. ✅ **Living Documentation**: Reports become executable documentation that matches business rules
5. ✅ **Reduced Redundancy**: No need to duplicate information - metadata serves as single source of truth
6. ✅ **Deep Observability**: All tests log input/output traces visible in reports
7. ✅ **Multi-Worker Support**: File-based persistence ensures metadata and traces are available across all worker processes
8. ✅ **Run History**: Unique run directories enable historical record keeping
9. ✅ **Validation**: Tests verify report generation correctness

### Files Modified/Created

#### Part 1: Fix Vitest Warning
1. ✅ `package.json` - Added `"type": "module"`

#### Part 2: Capture Test Intent
1. ✅ `test/fixtures/invariant-helper.ts` - Added `registerPrecondition()` and `logPrecondition()` helpers
2. ✅ `test/modules/tracer.ts` - Enhanced with file-based persistence (`registerInvariant`, `loadMetadata`, `getRunDir`)
3. ✅ `test/reporters/attestation-reporter.ts` - Display metadata in HTML reports with CSS, fallback trace lookup
4. ✅ `test/preconditions.spec.ts` - Added `registerPrecondition()` to all 19 tests
5. ✅ `test/regression.golden-master.test.ts` - Added `tracer.log()` to all tests
6. ✅ `test/integration.properties.test.ts` - Added `tracer.log()` to all tests
7. ✅ `test/report-generation.spec.ts` - Created with 5 validation tests

### Challenges Overcome

1. **Multi-Worker Metadata Sharing**
   - Original approach: In-memory Map per worker - FAILED
   - Solution: File-based persistence with shared run directory - WORKS
   - Additional: UUID/timestamp-based run IDs for historical records

2. **Trace Lookup Mismatch**
   - Original approach: Lookup by full test name only - FAILED for property tests
   - Solution: Try full test name first, fallback to metadata.name - WORKS

3. **Report Generation Validation**
   - Original approach: No validation tests
   - Solution: Created test/report-generation.spec.ts with 5 validation tests

### Backward Compatibility

- ✅ All test execution logic unchanged - only metadata registration and display
- ✅ Reporter changes are additive - without metadata, tests display normally
- ✅ Existing property tests already use `verifyInvariant()` which registers metadata
- ✅ CartBuilder already had tracer.log() built-in

### Validation Results

#### Part 1: Vitest Warning Fix
- ✅ Run `npm test` - the CJS deprecation warning disappears
- ✅ All tests pass
- ✅ TypeScript compiles without ESM-related errors

#### Part 2: Test Intent Metadata
- ✅ All tests pass
- ✅ precondition tests show: Business rule reference, Scenario description, Tags
- ✅ property tests display correctly (they use `verifyInvariant()`)
- ✅ All tests show "View Input/Output" traces in reports
- ✅ Report validation tests pass
- ✅ Run directories created with unique IDs per test run
- ✅ metadata.jsonl and interactions.jsonl files contain data

### Overall Status: ✅ COMPLETE

All phases of the plan have been successfully implemented and validated. The system now:
- Has no Vitest deprecation warnings
- Captures and displays test intent metadata in reports
- Handles multi-worker test execution correctly
- Shows input/output traces for all tests
- Validates report generation
- Maintains historical records of test runs
