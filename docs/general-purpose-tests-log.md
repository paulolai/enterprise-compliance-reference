# General-Purpose Tests Log
**Generated:** 2026-03-17
**Purpose:** Document general-purpose tests that catch classes of issues

## Philosophy

Instead of fragile tests tied to specific implementation details, we create tests that verify:
1. **System behavior** - Does it work?
2. **Contracts** - Do modules agree?
3. **Constraints** - Are we following rules?

These tests catch the issues we found AND will catch similar issues in the future.

---

## Test 1: Server Startup Integration Test

### Purpose
**Catches ANY issue that prevents server from starting**

### What It Tests
- Server can start without throwing
- Server responds to health check
- All API routes are registered

### Issues Caught
✅ **Import error in health.ts** - "Module does not provide an export named 'db'"
- Test output: `Server exited with code 1`
- Root cause: Broken import from refactored module
- This test catches ANY import error, not just this specific one

### Why It's General Purpose
- Doesn't check for specific files
- Doesn't verify specific exports exist
- Just tries to start server - if ANYTHING is broken, it fails
- Will catch future import errors, syntax errors, missing deps

### Location
`packages/server/test/server-startup.integration.test.ts`

---

## Test 2: Module Contracts Integration Test

### Purpose
**Catches module contract violations (imports, exports, environment assumptions)**

### What It Tests
- All imports from shared module are resolvable
- Server code doesn't use Vite-specific globals
- Server entry points can load all dependencies

### Issues Caught
✅ **Broken imports from shared module** - Multiple files importing unavailable exports
✅ **Vite globals in server** - `import.meta.env.DEV` used in rate limiter
✅ **Missing exports** - Server expects exports that don't exist

### Why It's General Purpose
- Checks ALL imports from shared module, not just specific ones
- Checks for ANY Vite globals, not just import.meta.env
- Verifies module graph is complete
- Will catch future contract breakages

### Location
`packages/server/test/module-contracts.integration.test.ts`

---

## Test Results Summary

### Before Fixes (Current State)
```
FAIL test/server-startup.integration.test.ts
  - Server exited with code 1
  - Import error: "Module does not provide an export named 'db'"

FAIL test/module-contracts.integration.test.ts
  - Module contract violations found
  - Vite globals found in server code
```

### After Fixes (Target State)
```
PASS test/server-startup.integration.test.ts
  - Server started in 2340ms
  - Health check responded with 200
  - All API routes loaded

PASS test/module-contracts.integration.test.ts
  - All imports resolvable
  - No Vite globals in server code
  - All entry points loadable
```

---

## How These Tests Prevent Issues

### Scenario 1: Developer Refactors Shared Module
**What happens:**
1. Developer moves `db` from shared to server package
2. They forget to update `health.ts`
3. Developer runs tests
4. **Server Startup Test FAILS** - "Server exited with code 1"
5. Developer sees error and fixes import

**Prevention:** Test catches issue during development, not in production

### Scenario 2: New Developer Copies Client Code to Server
**What happens:**
1. Developer copies rate limiter from client package
2. It uses `import.meta.env.DEV`
3. Developer runs tests
4. **Module Contracts Test FAILS** - "Vite globals found in server code"
5. Developer changes to `process.env.NODE_ENV`

**Prevention:** Test enforces architectural boundary

### Scenario 3: Missing Export Added
**What happens:**
1. Developer adds new feature requiring `env` export
2. They use it but forget to export it
3. Developer runs tests
4. **Module Contracts Test FAILS** - "Cannot resolve module"
5. Developer adds missing export

**Prevention:** Test ensures complete module interface

---

## Integration with CI

```yaml
# Add to .github/workflows/ci.yml
- name: General Purpose Tests
  run: |
    cd packages/server
    npx vitest run test/server-startup.integration.test.ts
    npx vitest run test/module-contracts.integration.test.ts
```

These tests run quickly (< 10 seconds) and provide fast feedback on architectural issues.

---

## Relationship to Static Analysis

| Approach | Speed | Scope | When to Use |
|----------|-------|-------|-------------|
| **Static Analysis** | Fast (< 1s) | Pattern detection | Pre-commit hooks, IDE |
| **General Tests** | Medium (< 10s) | Behavior verification | CI pipeline |
| **Full Test Suite** | Slow (> 60s) | Comprehensive | Before merge |

**Workflow:**
1. Developer writes code
2. Static analysis runs in IDE (immediate feedback)
3. General tests run in CI (catch missed issues)
4. Full test suite runs before merge (comprehensive check)

---

## Future Enhancements

### Test 3: Configuration Validator
```typescript
// Validates all required env vars are documented and have defaults
it('should have all required configuration', () => {
  // Check env.ts exports all vars used in codebase
  // Verify no hardcoded values
  // Ensure all vars have defaults or are documented
});
```

### Test 4: Security Headers Contract
```typescript
// Validates security headers are set via HTTP, not meta tags
it('should set security headers via HTTP', async () => {
  const response = await fetch('http://localhost:3000');
  expect(response.headers.get('X-Frame-Options')).toBeDefined();
  // Verify no security meta tags in HTML
});
```

### Test 5: API Contract Test
```typescript
// Validates all API endpoints match their schemas
it('should have consistent API contracts', async () => {
  // Check all POST /api/* endpoints have validation
  // Verify response schemas match documentation
  // Ensure no endpoints return 500 for valid input
});
```
