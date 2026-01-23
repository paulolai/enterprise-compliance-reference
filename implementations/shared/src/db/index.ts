import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import { join, dirname } from 'path';
import { mkdirSync, existsSync } from 'fs';

/**
 * Database connection singleton
 *
 * The database file is created in a data directory.
 * In production, this would be configured via environment variables.
 */

const DATABASE_PATH = process.env.DATABASE_PATH || join(process.cwd(), 'data/shop.db');

// Ensure data directory exists
const dbDir = dirname(DATABASE_PATH);
if (!existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true });
}

// Create database connection
const sqlite = new Database(DATABASE_PATH);

// Enable WAL mode for better concurrency
sqlite.pragma('journal_mode = WAL');

// Export drizzle instance
export const db = drizzle(sqlite, { schema });

// Export for direct access if needed
export { sqlite };

// Database connection helper
export async function connect() {
  return db;
}

// Close connection helper
export async function close() {
  sqlite.close();
}