/**
 * Core domain types shared across the API and the web client.
 * These describe the wire format (DTOs) of the REST contract — see schemas.ts
 * for the runtime-validated Zod versions, and contract.ts for endpoint metadata.
 */

/** Per-letter result when a guess is scored against the answer. */
export type LetterFeedback = 'correct' | 'present' | 'absent';

/** Lifecycle state of a game. */
export type GameStatus = 'in_progress' | 'won' | 'lost';

/** Game mode. Only "random" is supported for now (unlimited fresh games). */
export type GameMode = 'random';

/** Word validation/answer sources. */
export type WordSource = 'bundled' | 'system' | 'online';

/** How obscure the answer pool can be. */
export type Difficulty = 'normal' | 'hard';

/** Default / classic game rules (kept for backwards compatibility). */
export const WORD_LENGTH = 5;
export const MAX_GUESSES = 6;

/** Allowed word-length range (4–10 letters). */
export const MIN_WORD_LENGTH = 4;
export const MAX_WORD_LENGTH = 10;

/** A single scored guess in a game's history. */
export interface GuessResult {
  guess: string;
  feedback: LetterFeedback[];
  guessNumber: number;
}

/**
 * Full game state returned by the API.
 * `answer` is ALWAYS null while status === "in_progress" (no answer leak);
 * it is only populated once the game is "won" or "lost".
 */
export interface GameState {
  id: string;
  mode: GameMode;
  status: GameStatus;
  maxGuesses: number;
  wordLength: number;
  guesses: GuessResult[];
  remaining: number;
  answer: string | null;
  createdAt: string;
}

/** Response to a guess submission (a scored guess + the resulting game state delta). */
export interface GuessResponse {
  guess: string;
  feedback: LetterFeedback[];
  status: GameStatus;
  remaining: number;
  guessNumber: number;
  /** Null while in progress; the answer once the game is over. */
  answer: string | null;
}

/** Aggregate player statistics. */
export interface Stats {
  gamesPlayed: number;
  gamesWon: number;
  winPercentage: number;
  currentStreak: number;
  maxStreak: number;
  /** Buckets keyed "1".."6": how many wins took N guesses. */
  guessDistribution: Record<string, number>;
}

/** Standard error envelope returned for every non-2xx response. */
export interface ApiError {
  error: {
    code: ErrorCode;
    message: string;
  };
}

/** Stable, machine-readable error codes (mirrored in contract.ts). */
export type ErrorCode =
  | 'INVALID_LENGTH'
  | 'NOT_IN_DICTIONARY'
  | 'GAME_NOT_FOUND'
  | 'GAME_OVER'
  | 'VALIDATION_ERROR'
  | 'INTERNAL_ERROR';
