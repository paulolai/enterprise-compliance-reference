// Shared Core - Executable Specifications
// Browser-safe exports only - Node.js-only code is in index-server.ts

// Re-export domain types and logic from @executable-specs/domain
export * from '@executable-specs/domain';

// Shared utilities
export * from './modules/tracer-types';

// Shared validation schemas (single source of truth)
export * from './modules/validation';
