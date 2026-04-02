/**
 * Server-Only Shared Core
 *
 * This module exports Node.js-only code that should never be imported
 * in browser/client contexts. Import from here in server/test code only.
 *
 * For browser-safe types and utilities:
 * import { CartItem, toDollars } from '@executable-specs/shared';
 *
 * For server-side OTel setup:
 * import { setupOtel, shutdownOtel } from '@executable-specs/shared/index-server';
 */

// Re-export all browser-safe exports
export * from './index';

// OTel setup and invariant processing (Node.js-only)
export { setupOtel, shutdownOtel, getInvariantProcessor } from './modules/otel-setup';
export { InvariantSpanProcessor, DefaultEdgeCaseStrategy, PricingEdgeCaseStrategy } from './modules/invariant-span-processor';
export type { EdgeCaseStrategy } from './modules/invariant-span-processor';
export type { OtelConfig } from './modules/otel-setup';
