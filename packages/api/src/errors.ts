/**
 * Cross-cutting error contract.
 *
 * Route handlers throw `AppError` with a stable ErrorCode; the diagnostics
 * plugin's global error handler is the single place that converts errors into
 * the shared `{ error: { code, message } }` envelope with the right HTTP status.
 * This keeps routes and diagnostics decoupled.
 */
import { ERROR_STATUS, type ErrorCode } from '@wordle/shared';

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly statusCode: number;

  constructor(code: ErrorCode, message: string) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = ERROR_STATUS[code];
  }
}

/** Convenience constructors for the codes routes commonly throw. */
export const errors = {
  invalidLength: (msg = 'Guess must be 5 letters') => new AppError('INVALID_LENGTH', msg),
  notInDictionary: (msg = 'Not in word list') => new AppError('NOT_IN_DICTIONARY', msg),
  gameNotFound: (msg = 'Game not found') => new AppError('GAME_NOT_FOUND', msg),
  gameOver: (msg = 'Game is already over') => new AppError('GAME_OVER', msg),
};
