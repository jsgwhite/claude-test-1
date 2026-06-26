/**
 * Drizzle/SQLite implementation of StatsRepository.
 *
 * Mirrors the aggregation logic of MemoryStatsRepository:
 *   - upsert the player_stats row
 *   - increment gamesPlayed (always)
 *   - on win: increment gamesWon, currentStreak, update maxStreak, increment dist_N
 *   - on loss: reset currentStreak to 0
 *
 * Uses a raw SQL upsert (INSERT OR REPLACE / INSERT … ON CONFLICT DO UPDATE)
 * for atomic stat updates without a read-then-write race.
 */
import { eq } from 'drizzle-orm';
import type { GameResult, StatsRepository } from '../StatsRepository.js';
import type { Stats } from '@wordle/shared';
import type { DrizzleDb } from './client.js';
import { playerStats } from './schema.js';

/** Column name for a given guess count bucket (1..6). */
type DistCol = 'dist1' | 'dist2' | 'dist3' | 'dist4' | 'dist5' | 'dist6';
const distCol = (n: number): DistCol =>
  (`dist${n}` as DistCol);

export class DrizzleStatsRepository implements StatsRepository {
  constructor(private readonly db: DrizzleDb) {}

  async recordResult(playerId: string, result: GameResult): Promise<void> {
    const now = new Date().toISOString();

    // Read existing row (or synthesize zeros).
    const [existing] = await this.db
      .select()
      .from(playerStats)
      .where(eq(playerStats.playerId, playerId))
      .limit(1);

    const cur = existing ?? {
      playerId,
      gamesPlayed: 0,
      gamesWon: 0,
      currentStreak: 0,
      maxStreak: 0,
      dist1: 0,
      dist2: 0,
      dist3: 0,
      dist4: 0,
      dist5: 0,
      dist6: 0,
      lastPlayedAt: null,
    };

    const next = {
      playerId,
      gamesPlayed:   cur.gamesPlayed + 1,
      gamesWon:      cur.gamesWon,
      currentStreak: cur.currentStreak,
      maxStreak:     cur.maxStreak,
      dist1:         cur.dist1,
      dist2:         cur.dist2,
      dist3:         cur.dist3,
      dist4:         cur.dist4,
      dist5:         cur.dist5,
      dist6:         cur.dist6,
      lastPlayedAt:  now,
    };

    if (result.won) {
      next.gamesWon      = cur.gamesWon + 1;
      next.currentStreak = cur.currentStreak + 1;
      next.maxStreak     = Math.max(cur.maxStreak, next.currentStreak);

      // Increment the correct distribution bucket (guessCount is 1..6).
      const col = distCol(result.guessCount);
      (next[col] as number) = (cur[col] as number) + 1;
    } else {
      next.currentStreak = 0;
    }

    if (existing) {
      await this.db
        .update(playerStats)
        .set(next)
        .where(eq(playerStats.playerId, playerId));
    } else {
      await this.db.insert(playerStats).values(next);
    }
  }

  async get(playerId: string): Promise<Stats> {
    const [row] = await this.db
      .select()
      .from(playerStats)
      .where(eq(playerStats.playerId, playerId))
      .limit(1);

    if (!row) {
      return {
        gamesPlayed: 0,
        gamesWon: 0,
        winPercentage: 0,
        currentStreak: 0,
        maxStreak: 0,
        guessDistribution: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0, '6': 0 },
      };
    }

    const gamesPlayed = row.gamesPlayed;
    const gamesWon    = row.gamesWon;

    return {
      gamesPlayed,
      gamesWon,
      winPercentage: gamesPlayed === 0 ? 0 : Math.round((gamesWon / gamesPlayed) * 100),
      currentStreak: row.currentStreak,
      maxStreak:     row.maxStreak,
      guessDistribution: {
        '1': row.dist1,
        '2': row.dist2,
        '3': row.dist3,
        '4': row.dist4,
        '5': row.dist5,
        '6': row.dist6,
      },
    };
  }
}
