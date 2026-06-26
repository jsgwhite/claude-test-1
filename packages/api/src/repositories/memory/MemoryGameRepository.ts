/**
 * In-memory GameRepository — the test double / DB-swap proof.
 * Fully functional: used by integration tests (no SQLite needed) and demonstrates
 * that routes are decoupled from any concrete database.
 */
import type {
  GameRepository,
  GameWithGuesses,
  NewGameInput,
  NewGuessInput,
} from '../GameRepository.js';
import type { GameStatus } from '@wordle/shared';

export class MemoryGameRepository implements GameRepository {
  private games = new Map<string, GameWithGuesses>();

  async create(input: NewGameInput): Promise<GameWithGuesses> {
    const now = new Date().toISOString();
    const game: GameWithGuesses = {
      id: input.id,
      playerId: input.playerId,
      mode: input.mode,
      answer: input.answer,
      status: 'in_progress',
      maxGuesses: input.maxGuesses,
      wordLength: input.wordLength,
      createdAt: now,
      updatedAt: now,
      guesses: [],
    };
    this.games.set(game.id, game);
    return structuredClone(game);
  }

  async findById(id: string): Promise<GameWithGuesses | null> {
    const game = this.games.get(id);
    return game ? structuredClone(game) : null;
  }

  async appendGuess(gameId: string, guess: NewGuessInput): Promise<void> {
    const game = this.games.get(gameId);
    if (!game) throw new Error(`game ${gameId} not found`);
    game.guesses.push({ ...guess, createdAt: new Date().toISOString() });
    game.updatedAt = new Date().toISOString();
  }

  async updateStatus(gameId: string, status: GameStatus): Promise<void> {
    const game = this.games.get(gameId);
    if (!game) throw new Error(`game ${gameId} not found`);
    game.status = status;
    game.updatedAt = new Date().toISOString();
  }

  async ping(): Promise<void> {
    /* always healthy */
  }
}
