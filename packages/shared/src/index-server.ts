/**
 * Server-Only Shared Core
 *
 * NOTE: Database code has moved to @executable-specs/server.
 * This module now only re-exports browser-safe types for backward compatibility.
 *
 * For server-side database access, import directly from @executable-specs/server:
 * import { db, connect } from '@executable-specs/server/db';
 *
 * For browser-safe types and utilities:
 * import { CartItem, toDollars } from '@executable-specs/shared';
 */

// Re-export all browser-safe exports
export * from './index.ts';
