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

/**
 * Auto-create tables on startup if they don't exist
 * Uses raw SQL to check and create tables
 */
let tablesInitialized = false;
export function ensureTables() {
  if (tablesInitialized) return;

  const tables = [
    `CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled')),
      total INTEGER NOT NULL,
      pricing_result TEXT NOT NULL,
      shipping_address TEXT NOT NULL,
      stripe_payment_intent_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      sku TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      price INTEGER NOT NULL,
      weight_in_kg INTEGER NOT NULL,
      discount INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS products (
      sku TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      price_in_cents INTEGER NOT NULL,
      weight_in_kg INTEGER NOT NULL,
      category TEXT NOT NULL,
      image_url TEXT
    )`,
  ];

  for (const sql of tables) {
    try {
      sqlite.exec(sql);
    } catch (error) {
      console.error('Failed to create table:', error);
      throw error;
    }
  }

  tablesInitialized = true;
}

// Auto-initialize tables on module load
ensureTables();

// Export drizzle instance
export const db = drizzle(sqlite, { schema });

// Export for direct access if needed
export { sqlite };

// Database connection helper
export async function connect() {
  ensureTables();
  return db;
}

// Close connection helper
export async function close() {
  sqlite.close();
}