/**
 * Server-Only Shared Core
 *
 * This module exports database and server-only modules that require Node.js.
 * DO NOT import this module in browser/client-side code.
 *
 * For browser-safe types and utilities, import from './index' instead.
 *
 * @example
 * // Server-side code (API routes, server scripts)
 * import { db, connect } from 'shared/index-server';
 *
 * // Browser-side code (React components, client scripts)
 * import { CartItem, toDollars } from 'shared/index';
 */

// Re-export all browser-safe exports for convenience
export * from './index';

// Database exports (server-only - require Node.js)
export * from './db/schema';
export { db, sqlite, connect, close } from './db';
export { seedProducts, reseedProducts, productsToSeed } from './db/seed';
