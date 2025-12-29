# Plan: Capture Test Intent Metadata in Reports

**Status:** ✅ COMPLETED - See [PLAN_VITEST_WARNING_AND_METADATA.md](./PLAN_VITEST_WARNING_AND_METADATA.md) for full documentation

---

## Overview

This plan was merged into [PLAN_VITEST_WARNING_AND_METADATA.md](./PLAN_VITEST_WARNING_AND_METADATA.md) as Part 2 of that larger initiative. The metadata capture system has been fully implemented and validated.

## Problem Statement (Original)

The inline comments in `test/preconditions.spec.ts` explain test intent (e.g., "Validates: pricing-strategy.md §2 - Bulk Discounts", "Critical boundary: quantity = 3"), but this information only exists as code comments. Business stakeholders reviewing the reports cannot see:
- Which business rule each test validates
- Why a specific edge case matters
- Tags for filtering by domain (@pricing, @shipping, @critical)

## Implementation Summary

### ✅ Phase 1: Created Metadata Helper
- Added `registerPrecondition()` and `logPrecondition()` functions in `test/fixtures/invariant-helper.ts`
- Provides structured interface for capturing test intent

### ✅ Phase 2: Enhanced Reporter
- Modified `test/reporters/attestation-reporter.ts` to display metadata with CSS styling
- Added Business Rule, Scenario, and Tags display in HTML reports

### ✅ Phase 3: Multi-Worker Metadata Sharing
- Enhanced `test/modules/tracer.ts` with file-based persistence
- Shared run directory `/tmp/vitest-runs/run-<id>/` stores `metadata.jsonl`
- UUID/timestamp-based run IDs for historical records

### ✅ Phase 4: Trace Lookup Fix
- Added fallback lookup for property tests (try full test name, then metadata.name)
- Ensures all test types show traces correctly

### ✅ Phase 5: Updated All Tests
- Added `registerPrecondition()` to all 19 precondition tests
- Added `tracer.log()` to regression.golden-master.test.ts and integration.properties.test.ts
- CartBuilder already had logging built-in, so pricing.spec.ts and shipping.spec.ts work automatically

### ✅ Phase 6: Added Validation Tests
- Created `test/report-generation.spec.ts` with 5 validation tests
- Verifies metadata registration, trace logging, report structure, and data integrity

## Benefits Achieved

1. ✅ **Report Traceability**: Business stakeholders can see exactly which pricing-strategy.md section each test validates
2. ✅ **Intent Clarity**: Scenario descriptions explain WHY each edge case matters (e.g., "Critical boundary: exactly at threshold")
3. ✅ **Tag-Based Filtering**: Tags (@pricing, @shipping, @boundary, @critical) enable filtering reports by domain
4. ✅ **Living Documentation**: Reports become executable documentation that matches business rules
5. ✅ **Reduced Redundancy**: No need to duplicate information - metadata serves as single source of truth
6. ✅ **Deep Observability**: All tests log input/output traces visible in reports
7. ✅ **Multi-Worker Support**: File-based persistence ensures metadata and traces are available across all worker processes
8. ✅ **Run History**: Unique run directories enable historical record keeping

## Files Modified

1. ✅ `test/fixtures/invariant-helper.ts` - Added metadata helpers
2. ✅ `test/modules/tracer.ts` - Enhanced with file-based persistence
3. ✅ `test/reporters/attestation-reporter.ts` - Display metadata with CSS
4. ✅ `test/preconditions.spec.ts` - Added metadata to all 19 tests
5. ✅ `test/regression.golden-master.test.ts` - Added tracer.log() to all tests
6. ✅ `test/integration.properties.test.ts` - Added tracer.log() to property tests
7. ✅ `test/report-generation.spec.ts` - Created validation tests

## Validation Results

- ✅ All tests pass (65 tests)
- ✅ precondition tests show: Business rule reference, Scenario description, Tags
- ✅ property tests display correctly with metadata
- ✅ All tests show "View Input/Output" traces in reports
- ✅ Report validation tests pass
- ✅ Run directories created with unique IDs per test run
- ✅ metadata.jsonl and interactions.jsonl files contain data

## See Also

[PLAN_VITEST_WARNING_AND_METADATA.md](./PLAN_VITEST_WARNING_AND_METADATA.md) - Full implementation details including Part 1 (Vitest warning fix)
