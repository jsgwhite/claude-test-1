import {
  PLAYER_ID_HEADER,
  ROUTES,
  gamePath,
  guessPath,
} from '@wordle/shared';
import type { GameState, GuessResponse, Stats, ErrorCode, WordSource, Difficulty } from '@wordle/shared';

export interface CreateGameOptions {
  wordLength?: number;
  difficulty?: Difficulty;
  wordSources?: WordSource[];
}

// ---------------------------------------------------------------------------
// Player-id management
// ---------------------------------------------------------------------------

const PLAYER_ID_KEY = 'wordle.playerId';

function getPlayerId(): string {
  let id = localStorage.getItem(PLAYER_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(PLAYER_ID_KEY, id);
  }
  return id;
}

// ---------------------------------------------------------------------------
// Error type
// ---------------------------------------------------------------------------

export class ApiClientError extends Error {
  code: ErrorCode;
  constructor(code: ErrorCode, message: string) {
    super(message);
    this.name = 'ApiClientError';
    this.code = code;
  }
}

// ---------------------------------------------------------------------------
// Fetch helper
// ---------------------------------------------------------------------------

async function apiFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      [PLAYER_ID_HEADER]: getPlayerId(),
      ...(options?.headers ?? {}),
    },
  });

  if (!response.ok) {
    let code: ErrorCode = 'INTERNAL_ERROR';
    let message = `HTTP ${response.status}`;
    try {
      const body = await response.json() as { error?: { code?: ErrorCode; message?: string } };
      if (body?.error?.code) code = body.error.code;
      if (body?.error?.message) message = body.error.message;
    } catch {
      // ignore parse errors
    }
    throw new ApiClientError(code, message);
  }

  return response.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Typed API functions
// ---------------------------------------------------------------------------

export function createGame(opts?: CreateGameOptions): Promise<GameState> {
  return apiFetch<GameState>(ROUTES.createGame, {
    method: 'POST',
    body: JSON.stringify({ mode: 'random', ...opts }),
  });
}

export function submitGuess(
  id: string,
  guess: string,
  enableOnline?: boolean,
): Promise<GuessResponse> {
  return apiFetch<GuessResponse>(guessPath(id), {
    method: 'POST',
    body: JSON.stringify({ guess, ...(enableOnline ? { enableOnline: true } : {}) }),
  });
}

export function getGame(id: string): Promise<GameState> {
  return apiFetch<GameState>(gamePath(id));
}

export function getStats(): Promise<Stats> {
  return apiFetch<Stats>(ROUTES.stats);
}
