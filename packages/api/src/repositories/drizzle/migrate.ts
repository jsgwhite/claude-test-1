/**
 * Standalone migration script: `npm run db:migrate`
 *
 * Opens (or creates) the SQLite database and runs the idempotent DDL via
 * `createDrizzleClient`, which always executes CREATE TABLE IF NOT EXISTS
 * statements. This is equivalent to running a migration and is safe to run
 * multiple times.
 */
import { createDrizzleClient } from './client.js';
import { loadConfig } from '../../config.js';

const config = loadConfig();
console.log(`[migrate] Running migrations on ${config.dbFile} …`);
createDrizzleClient(config.dbFile);
console.log('[migrate] Done — all tables exist.');
