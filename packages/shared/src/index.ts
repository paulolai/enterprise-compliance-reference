// Shared Core - Executable Specifications
// Browser-safe exports only - database code is in index-server.ts

// Re-export domain types and logic from @executable-specs/domain
export * from '@executable-specs/domain';

// Shared utilities
export * from './modules/tracer-types';

// Shared validation schemas (single source of truth)
export * from './modules/validation';

// OTel setup and invariant processing
export { setupOtel, shutdownOtel, getInvariantProcessor } from './modules/otel-setup';
export { InvariantSpanProcessor } from './modules/invariant-span-processor';
export type { OtelConfig } from './modules/otel-setup';
