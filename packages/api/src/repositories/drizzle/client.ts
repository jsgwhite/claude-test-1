/**
 * Drizzle/SQLite client factory.
 * Confines the database engine choice to this one module — the rest of the app
 * depends on repository interfaces, not on this.
 *
 * `createDrizzleClient` also runs idempotent CREATE TABLE IF NOT EXISTS DDL so
 * that `npm run dev` works without a manual migration step.
 */
import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema.js';

export type DrizzleDb = BetterSQLite3Database<typeof schema>;

/** DDL executed once per process on every open (idempotent). */
const INIT_DDL = `
CREATE TABLE IF NOT EXISTS games (
  id          TEXT    PRIMARY KEY,
  player_id   TEXT,
  mode        TEXT    NOT NULL,
  answer      TEXT    NOT NULL,
  status      TEXT    NOT NULL,
  max_guesses INTEGER NOT NULL,
  word_length INTEGER NOT NULL,
  created_at  TEXT    NOT NULL,
  updated_at  TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS guesses (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id      TEXT    NOT NULL REFERENCES games(id),
  guess_number INTEGER NOT NULL,
  word         TEXT    NOT NULL,
  feedback     TEXT    NOT NULL,
  created_at   TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS player_stats (
  player_id      TEXT    PRIMARY KEY,
  games_played   INTEGER NOT NULL DEFAULT 0,
  games_won      INTEGER NOT NULL DEFAULT 0,
  current_streak INTEGER NOT NULL DEFAULT 0,
  max_streak     INTEGER NOT NULL DEFAULT 0,
  dist_1         INTEGER NOT NULL DEFAULT 0,
  dist_2         INTEGER NOT NULL DEFAULT 0,
  dist_3         INTEGER NOT NULL DEFAULT 0,
  dist_4         INTEGER NOT NULL DEFAULT 0,
  dist_5         INTEGER NOT NULL DEFAULT 0,
  dist_6         INTEGER NOT NULL DEFAULT 0,
  last_played_at TEXT
);
`;

export function createDrizzleClient(file: string): DrizzleDb {
  const sqlite = new Database(file);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');

  // Ensure tables exist on every open — idempotent DDL, so safe to re-run.
  sqlite.exec(INIT_DDL);

  return drizzle(sqlite, { schema });
}
