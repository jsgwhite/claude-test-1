/**
 * Drizzle table definitions (SQLite).
 *
 * Tables:
 *   games        — one row per game (answer kept server-side only)
 *   guesses      — one row per guess, ordered by guess_number
 *   player_stats — one row per player, aggregated stats
 */
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const games = sqliteTable('games', {
  id:         text('id').primaryKey(),
  playerId:   text('player_id'),                       // nullable
  mode:       text('mode').notNull(),                  // 'random'
  answer:     text('answer').notNull(),
  status:     text('status').notNull(),                // 'in_progress' | 'won' | 'lost'
  maxGuesses: integer('max_guesses').notNull(),
  wordLength: integer('word_length').notNull(),
  createdAt:  text('created_at').notNull(),
  updatedAt:  text('updated_at').notNull(),
});

export const guesses = sqliteTable('guesses', {
  id:          integer('id').primaryKey({ autoIncrement: true }),
  gameId:      text('game_id').notNull().references(() => games.id),
  guessNumber: integer('guess_number').notNull(),
  word:        text('word').notNull(),
  feedback:    text('feedback').notNull(),             // JSON string of LetterFeedback[]
  createdAt:   text('created_at').notNull(),
});

export const playerStats = sqliteTable('player_stats', {
  playerId:      text('player_id').primaryKey(),
  gamesPlayed:   integer('games_played').notNull().default(0),
  gamesWon:      integer('games_won').notNull().default(0),
  currentStreak: integer('current_streak').notNull().default(0),
  maxStreak:     integer('max_streak').notNull().default(0),
  dist1:         integer('dist_1').notNull().default(0),
  dist2:         integer('dist_2').notNull().default(0),
  dist3:         integer('dist_3').notNull().default(0),
  dist4:         integer('dist_4').notNull().default(0),
  dist5:         integer('dist_5').notNull().default(0),
  dist6:         integer('dist_6').notNull().default(0),
  lastPlayedAt:  text('last_played_at'),               // nullable ISO timestamp
});
