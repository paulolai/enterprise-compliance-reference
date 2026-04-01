# Issue Fixes Log
**Generated:** 2026-03-17
**Source:** Exploratory Testing Findings

## How to Use This Document

When static analysis detects an issue, find the pattern here and apply the fix.
This keeps the validator generic while providing solutions.

---

## Pattern 1: Broken Import from Refactored Module

### Detection
- File imports from a module that no longer exports the symbol
- TypeScript error: "Module does not provide an export named 'X'"

### Issues Found
1. **health.ts:3** - Importing `db` from `@executable-specs/shared/index-server`
2. **shutdown.ts:3** - Importing `close` from `@executable-specs/shared/index-server`
3. **standalone.ts:19** - Importing `seedProducts` from `@executable-specs/shared/index-server`

### Root Cause
Shared module was refactored to move database code to server package, but dependent files weren't updated.

### Fix Applied
```typescript
// BEFORE (broken):
import { db } from '@executable-specs/shared/index-server';
import { close } from '@executable-specs/shared/index-server';
import { seedProducts } from '@executable-specs/shared/index-server';

// AFTER (fixed):
import { db } from '../../db';
import { close } from '../../db';
import { seedProducts } from '../db/seed';
```

### Prevention
- Add integration test that starts server
- Use relative imports for same-package dependencies
- Update all dependents when refactoring shared modules

---

## Pattern 2: Missing Exports

### Detection
- File imports symbol that doesn't exist in target module
- TypeScript error: "Module has no exported member 'X'"

### Issue Found
**lib/env.ts** - Missing exports: `env`, `getEnvSummary`

### Root Cause
New code (standalone.ts) expects exports that don't exist in existing module.

### Fix Applied
```typescript
// BEFORE (missing):
export const isDevelopment = process.env.NODE_ENV === 'development';
export const isProduction = process.env.NODE_ENV === 'production';
export const isStripeConfigured = !!process.env.STRIPE_SECRET_KEY;

// AFTER (added):
export const isDevelopment = process.env.NODE_ENV === 'development';
export const isProduction = process.env.NODE_ENV === 'production';
export const isStripeConfigured = !!process.env.STRIPE_SECRET_KEY;

export const env = {
  PORT: parseInt(process.env.PORT || '3000'),
};

export function getEnvSummary() {
  return {
    NODE_ENV: process.env.NODE_ENV,
    PORT: env.PORT,
  };
}
```

### Prevention
- Use TypeScript's --noEmit to catch missing exports before runtime
- Add unit tests that import all public APIs
- Keep exports.ts or index.ts as explicit manifest

---

## Pattern 3: Environment Variable Context Mismatch

### Detection
- Code uses `import.meta.env` in Node.js context
- Runtime error: "Cannot read properties of undefined (reading 'DEV')"

### Issue Found
**middleware/rate-limit.ts:156** - Using `import.meta.env.DEV` instead of `process.env.NODE_ENV`

### Root Cause
Vite provides `import.meta.env` but Node.js doesn't. Server code was copy-pasted from client code or assumed Vite environment.

### Fix Applied
```typescript
// BEFORE (broken):
if (import.meta.env.DEV) {
  return next();
}

// AFTER (fixed):
if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
  return next();
}
```

### Prevention
- Use process.env for server-side code
- Add lint rule: "No import.meta.env in packages/server"
- Create environment abstraction layer

---

## Pattern 4: Security Headers in Wrong Location

### Detection
- X-Frame-Options meta tag in HTML head
- Browser console warning

### Issue Found
**index.html** - X-Frame-Options in meta tag instead of HTTP header

### Root Cause
Developer added security headers as meta tags not realizing they should be HTTP headers.

### Fix Applied
```html
<!-- BEFORE (wrong): -->
<meta http-equiv="X-Frame-Options" content="DENY">

<!-- AFTER: Remove meta tag, add to server middleware -->
// In security middleware:
c.header('X-Frame-Options', 'DENY');
```

### Prevention
- Add static analysis that scans HTML for security meta tags
- Create security headers checklist
- Use security-focused linting

---

## Fix Checklist Template

When static analysis finds an issue:

- [ ] Identify the pattern (1-4 above)
- [ ] Apply fix from this document
- [ ] Run static analysis again to verify fix
- [ ] Add regression test
- [ ] Update this log if new pattern discovered

---

## Pattern 5: Heading Hierarchy Violations (WCAG 1.3.1)

### Detection
- Automated accessibility test reports: "Heading \"X\" (h3) skips level from previous (h1)"
- Headings jump from h1 directly to h3 without h2

### Issues Found
**Products page** - Product cards use h3 directly under page h1
**Homepage** - Product cards may have similar issues

### Root Cause
Product card components use `<h3>` for product names, but there's no `<h2>` section heading between the page title (h1) and the products.

### Current Heading Structure (Products Page):
```
h1: "Products"
h3: "Wireless Earbuds"  ← SKIPS h2
h3: "Smart Watch"       ← SKIPS h2
...
```

### Fix Options

**Option A: Add h2 Section Headers (Recommended)**
```html
<h1>Products</h1>
<h2>Electronics</h2>
<h3>Wireless Earbuds</h3>
...
```

**Option B: Use semantic elements instead of headings for product names**
```html
<h1>Products</h1>
<article>
  <div class="product-title">Wireless Earbuds</div>  <!-- Not a heading -->
</article>
```

**Option C: Keep current structure with ARIA (Acceptable for now)**
```html
<h1>Products</h1>
<div role="region" aria-label="Product listings">
  <h3>Wireless Earbuds</h3>
</div>
```

### Prevention
- Added accessibility tests in `test/e2e/accessibility.ui.properties.test.ts`
- Test runs on CI and will catch hierarchy violations
- WCAG 2.1 Level A compliance requirement

---

## Pattern 6: Missing 404 Error Page

### Detection
- Navigate to `/non-existent-page` shows homepage content instead of 404
- URL remains invalid path but content is homepage
- Test: "Non-existent routes display 404 error page" fails

### Issues Found
**SPA routing** - React Router fallback renders homepage for all unknown routes

### Root Cause
Client-side routing catches all paths and renders homepage. No 404 boundary component exists.

### Fix Required
1. Add catch-all route in React Router that renders 404 component
2. Ensure 404 component shows:
   - Clear "Page Not Found" message
   - Brand-consistent styling
   - Navigation links (Home, Products, etc.)
   - HTTP 404 status (via SSR or meta tag)

### Code Example
```tsx
// App.tsx
<Route path="*" element={<NotFoundPage />} />

// NotFoundPage.tsx
export function NotFoundPage() {
  return (
    <div className="error-page">
      <h1>404 - Page Not Found</h1>
      <p>The page you're looking for doesn't exist.</p>
      <Link to="/">Go Home</Link>
    </div>
  );
}
```

### Prevention
- Added error page tests in `test/e2e/error-pages.ui.properties.test.ts`
- Test checks that 404 URLs don't show homepage content

---

## Stats

| Pattern | Issues Found | Severity | Fixed |
|---------|--------------|----------|-------|
| Broken Import | 3 | High | Yes |
| Missing Export | 2 | High | Yes |
| Env Context Mismatch | 1 | High | Yes |
| Security Header Location | 1 | Low | No (documented) |
| Heading Hierarchy | 2 | Medium | No (tests added) |
| Missing 404 Page | 1 | Medium | No (tests added) |

**Total Issues Found:** 10
**Total Fixed:** 6 
**In Progress:** 4 (2 with tests added, awaiting implementation)
