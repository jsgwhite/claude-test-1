/**
 * Shared test setup for API integration tests.
 *
 * makeApp() builds a full Fastify server wired to in-memory repositories and a
 * deterministic WordList stub so tests never depend on the real dictionary or
 * a random answer.
 */
import { buildServer } from '../src/server.js';
import { MemoryGameRepository } from '../src/repositories/memory/MemoryGameRepository.js';
import { MemoryStatsRepository } from '../src/repositories/memory/MemoryStatsRepository.js';
import type { WordList } from '../src/domain/wordlist.js';
import type { FastifyInstance } from 'fastify';

/**
 * Build a WordList stub with a fixed answer and a small dictionary.
 * Every word your tests submit as a valid guess MUST appear in `dictionary`.
 * Any word you want to be invalid should NOT be in `dictionary`.
 */
export function stubWordList(answer: string, dictionary: string[]): WordList {
  const valid = new Set([...dictionary, answer]);
  return {
    randomAnswer: () => answer,
    isValidGuess: async (word: string) => valid.has(word),
  };
}

export interface AppFixture {
  app: FastifyInstance;
}

export interface MakeAppOptions {
  /** The secret answer the stub WordList will always return. Default: 'crane' */
  answer?: string;
  /**
   * Valid 5-letter words accepted by the stub dictionary (answer is auto-included).
   * Must include every valid guess your tests will submit.
   * Default includes a small hand-picked set around the default answer.
   */
  dictionary?: string[];
}

/** Default dictionary for tests using answer='crane'. */
const DEFAULT_DICTIONARY = [
  'crane', // answer itself
  'caulk', // valid wrong guess (c_correct, a_present)
  'slate', // valid wrong guess
  'audio', // valid wrong guess
  'adieu', // valid wrong guess
  'stare', // valid wrong guess
  'plumb', // valid wrong guess (all absent from 'crane')
  'tryst', // valid wrong guess (all absent)
  'flops', // valid wrong guess (all absent from 'crane')
  'boxer', // valid wrong guess
  'windy', // valid wrong guess
];

export async function makeApp(opts: MakeAppOptions = {}): Promise<AppFixture> {
  const answer = opts.answer ?? 'crane';
  const dictionary = opts.dictionary ?? DEFAULT_DICTIONARY;

  const app = await buildServer({
    deps: {
      gameRepo: new MemoryGameRepository(),
      statsRepo: new MemoryStatsRepository(),
      wordList: stubWordList(answer, dictionary),
    },
    logger: false,
  });

  return { app };
}

/** A stable player UUID for tests that need a consistent identity. */
export const TEST_PLAYER_ID = 'test-player-00000000-0000-0000-0000-000000000001';

/** Convenience: POST /api/games and return the parsed body. */
export async function createGame(
  app: FastifyInstance,
  playerId: string = TEST_PLAYER_ID,
): Promise<{ id: string; status: string; remaining: number; guesses: unknown[]; answer: unknown }> {
  const res = await app.inject({
    method: 'POST',
    url: '/api/games',
    headers: { 'x-player-id': playerId },
  });
  return JSON.parse(res.body) as {
    id: string;
    status: string;
    remaining: number;
    guesses: unknown[];
    answer: unknown;
  };
}

/** Convenience: POST /api/games/:id/guesses. */
export async function submitGuess(
  app: FastifyInstance,
  gameId: string,
  word: string,
  playerId: string = TEST_PLAYER_ID,
) {
  return app.inject({
    method: 'POST',
    url: `/api/games/${gameId}/guesses`,
    headers: { 'x-player-id': playerId, 'content-type': 'application/json' },
    body: JSON.stringify({ guess: word }),
  });
}

/** Convenience: GET /api/games/:id. */
export async function getGame(
  app: FastifyInstance,
  gameId: string,
  playerId: string = TEST_PLAYER_ID,
) {
  return app.inject({
    method: 'GET',
    url: `/api/games/${gameId}`,
    headers: { 'x-player-id': playerId },
  });
}

/** Convenience: GET /api/stats. */
export async function getStats(app: FastifyInstance, playerId: string = TEST_PLAYER_ID) {
  return app.inject({
    method: 'GET',
    url: '/api/stats',
    headers: { 'x-player-id': playerId },
  });
}
