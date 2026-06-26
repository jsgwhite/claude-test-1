/**
 * StatsRepository — the storage seam for aggregate player stats.
 * Same swappability contract as GameRepository: handlers depend on this interface only.
 */
import type { Stats } from '@wordle/shared';

/** Outcome recorded when a game finishes. */
export interface GameResult {
  /** Whether the game was won. */
  won: boolean;
  /** Number of guesses used when won (1..maxGuesses); ignored when lost. */
  guessCount: number;
}

export interface StatsRepository {
  /**
   * Record a finished game's result for a player, updating aggregates,
   * streaks, and the guess distribution. No-op-safe for anonymous players
   * (implementations may key anonymous results under a synthetic id or skip).
   */
  recordResult(playerId: string, result: GameResult): Promise<void>;

  /** Return aggregate stats for a player (zeroed if none recorded). */
  get(playerId: string): Promise<Stats>;
}
