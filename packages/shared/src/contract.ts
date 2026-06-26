/**
 * REST contract metadata: base path, route templates, status codes, error codes,
 * and the player-id header name. Both the API and the web client import these so
 * paths/codes are never hard-coded in two places.
 */
import type { ErrorCode } from './types.js';

/** Header carrying the client-generated player UUID (no auth). */
export const PLAYER_ID_HEADER = 'x-player-id';

/** API base path. */
export const API_BASE = '/api';

/** Route templates. `:id` is substituted by the client/server router. */
export const ROUTES = {
  createGame: `${API_BASE}/games`,
  getGame: `${API_BASE}/games/:id`,
  submitGuess: `${API_BASE}/games/:id/guesses`,
  stats: `${API_BASE}/stats`,
  health: `${API_BASE}/health`,
  metrics: `${API_BASE}/metrics`,
} as const;

/** Build a concrete game path from an id (client-side helper). */
export const gamePath = (id: string) => `${API_BASE}/games/${id}`;
export const guessPath = (id: string) => `${API_BASE}/games/${id}/guesses`;

/** HTTP status codes used by the contract. */
export const STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE: 422,
  INTERNAL: 500,
} as const;

/** Canonical mapping of error codes to their default HTTP status. */
export const ERROR_STATUS: Record<ErrorCode, number> = {
  INVALID_LENGTH: STATUS.BAD_REQUEST,
  NOT_IN_DICTIONARY: STATUS.UNPROCESSABLE,
  GAME_NOT_FOUND: STATUS.NOT_FOUND,
  GAME_OVER: STATUS.CONFLICT,
  VALIDATION_ERROR: STATUS.BAD_REQUEST,
  INTERNAL_ERROR: STATUS.INTERNAL,
};
