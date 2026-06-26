/**
 * In-memory StatsRepository — fully functional test double.
 * Encapsulates the aggregate/streak/distribution math so the same logic is
 * exercised by tests; the Drizzle implementation mirrors this behavior.
 */
import type { GameResult, StatsRepository } from '../StatsRepository.js';
import type { Stats } from '@wordle/shared';

interface Internal {
  gamesPlayed: number;
  gamesWon: number;
  currentStreak: number;
  maxStreak: number;
  dist: Record<string, number>;
}

function empty(): Internal {
  return {
    gamesPlayed: 0,
    gamesWon: 0,
    currentStreak: 0,
    maxStreak: 0,
    dist: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0, '6': 0 },
  };
}

export class MemoryStatsRepository implements StatsRepository {
  private byPlayer = new Map<string, Internal>();

  async recordResult(playerId: string, result: GameResult): Promise<void> {
    const s = this.byPlayer.get(playerId) ?? empty();
    s.gamesPlayed += 1;
    if (result.won) {
      s.gamesWon += 1;
      s.currentStreak += 1;
      s.maxStreak = Math.max(s.maxStreak, s.currentStreak);
      const key = String(result.guessCount);
      if (key in s.dist) s.dist[key] += 1;
    } else {
      s.currentStreak = 0;
    }
    this.byPlayer.set(playerId, s);
  }

  async get(playerId: string): Promise<Stats> {
    const s = this.byPlayer.get(playerId) ?? empty();
    return {
      gamesPlayed: s.gamesPlayed,
      gamesWon: s.gamesWon,
      winPercentage: s.gamesPlayed === 0 ? 0 : Math.round((s.gamesWon / s.gamesPlayed) * 100),
      currentStreak: s.currentStreak,
      maxStreak: s.maxStreak,
      guessDistribution: { ...s.dist },
    };
  }
}
