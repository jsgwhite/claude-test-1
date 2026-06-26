/**
 * GameRepository — the storage seam for games.
 *
 * Route handlers depend ONLY on this interface, never on Drizzle/SQLite. To swap
 * the database you write a new implementation of this interface and change the
 * single place it is constructed (src/index.ts). Routes do not change.
 *
 * Implementations live in ./drizzle (production, SQLite) and ./memory (tests).
 */
import type { GameMode, GameStatus, LetterFeedback } from '@wordle/shared';

/** Persisted game, including the secret answer (server-only, never serialized to clients). */
export interface GameRecord {
  id: string;
  playerId: string | null;
  mode: GameMode;
  answer: string;
  status: GameStatus;
  maxGuesses: number;
  wordLength: number;
  createdAt: string;
  updatedAt: string;
}

/** A persisted guess within a game. */
export interface GuessRecord {
  guessNumber: number;
  word: string;
  feedback: LetterFeedback[];
  createdAt: string;
}

/** A game together with its ordered guess history. */
export interface GameWithGuesses extends GameRecord {
  guesses: GuessRecord[];
}

/** Input for creating a new game. */
export interface NewGameInput {
  id: string;
  playerId: string | null;
  mode: GameMode;
  answer: string;
  maxGuesses: number;
  wordLength: number;
}

/** Input for appending a guess. */
export interface NewGuessInput {
  guessNumber: number;
  word: string;
  feedback: LetterFeedback[];
}

export interface GameRepository {
  create(input: NewGameInput): Promise<GameWithGuesses>;
  findById(id: string): Promise<GameWithGuesses | null>;
  appendGuess(gameId: string, guess: NewGuessInput): Promise<void>;
  updateStatus(gameId: string, status: GameStatus): Promise<void>;
  /** Lightweight liveness check used by the health endpoint. */
  ping(): Promise<void>;
}
