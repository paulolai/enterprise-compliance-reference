import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './implementations/shared/src/db/schema.ts',
  out: './migrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? './data/shop.db',
  },
});