/**
 * Drizzle Kit configuration for `npm run db:generate` (generates SQL migration files).
 * The actual runtime migration is handled by client.ts via CREATE TABLE IF NOT EXISTS.
 */
import type { Config } from 'drizzle-kit';

export default {
  schema: './src/repositories/drizzle/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: process.env['DB_URL'] ?? 'wordle.sqlite',
  },
} satisfies Config;
