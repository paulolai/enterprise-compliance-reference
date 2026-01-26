# API Routing Bug - Root Cause Analysis

## The Problem

Playwright API tests return HTML instead of JSON for GET requests (and POST requests are also affected but tests may not validate this).

## Root Cause

**File:** `implementations/react-playwright/vite.config.ts`

The Hono middleware is **never registered** with Vite's middleware stack.

```typescript
plugins: [
  react(),
  {
    name: 'hono-server',
    configureServer(server) {
      return () => {
        // This function defines middleware but NEVER calls server.middlewares.use()
        const apiMiddleware = async (req, res, next) => {
          // 70+ lines of middleware implementation...
        };
      }; // apiMiddleware dies here, never added to the stack
    },
  },
],
```

## How It Actually Works

### Current (Broken) Flow
```
Playwright request → Vite dev server → Static file middleware → Returns index.html
```

Since `apiMiddleware` is never registered, ALL requests fall through to Vite's static file handling.

### Correct Flow (What Should Happen)
```
Playwright request → Vite dev server → apiMiddleware → Hono app → JSON response
```

## Why Unit Tests Pass

Unit tests (17 passing) bypass Vite's middleware entirely:

```typescript
// src/unit/hono-app.test.ts
const response = await app.fetch(createTestRequest('/api/products'));
```

They call `app.fetch()` directly on the Hono app, so the middleware registration issue doesn't matter.

## The Fix

The middleware needs to be registered with `server.middlewares.use()`:

```typescript
{
  name: 'hono-server',
  configureServer(server) {
    // Define middleware directly, return early cleanup function
    const apiMiddleware = async (req: http.IncomingMessage, res: http.ServerResponse, next: () => void) => {
      // ... middleware implementation ...
    };

    // THIS LINE WAS MISSING:
    server.middlewares.use(apiMiddleware);

    // Optional: return cleanup function
    return () => {
      // Remove middleware on server shutdown
    };
  },
},
```

## Vite Plugin API Reference

According to Vite's documentation:

- `configureServer(server)` is called when the dev server starts
- You should register middleware **during** this function, not in the returned function
- The returned function is for **cleanup** (called when the dev server shuts down)

Reference: https://vite.dev/guide/using-plugins.html#server-hooks

## Evidence from Debug Logs

The middleware debug logging (`[VITE-MIDDLEWARE] Request URL:`) only shows `/index.html` requests. This confirms that `/api/*` requests never reach our middleware—they're being handled by Vite's internal static file handler instead.

## Impact

| Test Type | Status | Reason |
|-----------|--------|--------|
| Unit tests | ✅ PASS | Direct `app.fetch()` calls, bypass Vite |
| POST API tests | ⚠️ APPEAR PASS | May lack HTML validation |
| GET API tests | ❌ FAIL | Explicit HTML validation fails |

All API tests that go through the Vite dev server are getting HTML instead of JSON because the middleware is not registered.
