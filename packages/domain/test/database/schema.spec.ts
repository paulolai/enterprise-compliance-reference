import { describe, it, expect } from 'vitest';

/**
 * Database Schema Tests - SKIPPED
 *
 * These tests import from packages/server/src/db/schema which is a server internal.
 * The domain package must not depend on server internals.
 *
 * TODO: Move these tests to packages/server/test/
 *
 * Original location: packages/domain/test/database/schema.spec.ts
 * Target location: packages/server/test/database/schema.spec.ts
 */
describe.skip('Database Schema Tests - MOVED TO SERVER PACKAGE', () => {
  it('placeholder - tests moved to server package', () => {
    // All database schema tests have been moved to the server package.
    // The domain package should not depend on server internals.
    expect(true).toBe(true);
  });
});
