/**
 * Integration tests for the game routes.
 *
 * Uses in-memory repos + a deterministic WordList stub (answer = 'crane').
 * Tests run against Fastify's `app.inject` — no real TCP sockets.
 *
 * Key safety checks highlighted with *** SAFETY CHECK *** comments:
 *   1. Answer leak: GameState.answer must be null while in_progress.
 *   2. Dictionary rejection must not consume a guess (remaining unchanged).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import type { GameState, GuessResponse } from '@wordle/shared';
import {
  makeApp,
  createGame,
  submitGuess,
  getGame,
  TEST_PLAYER_ID,
} from './helpers.js';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

let app: FastifyInstance;

beforeEach(async () => {
  // Fresh server + in-memory repos for every test — no state bleeds between tests.
  ({ app } = await makeApp({ answer: 'crane' }));
});

// ---------------------------------------------------------------------------
// POST /api/games
// ---------------------------------------------------------------------------

describe('POST /api/games — create game', () => {
  it('returns 201 with a valid initial GameState', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/games',
      headers: { 'x-player-id': TEST_PLAYER_ID },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body) as GameState;
    expect(body.status).toBe('in_progress');
    expect(body.remaining).toBe(6);
    expect(body.guesses).toEqual([]);
    expect(body.id).toBeTruthy();
  });

  it('*** SAFETY CHECK *** answer is null while in_progress (no answer leak on create)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/games',
      headers: { 'x-player-id': TEST_PLAYER_ID },
    });

    const body = JSON.parse(res.body) as GameState;
    expect(body.answer).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// POST /api/games/:id/guesses — valid guess with known feedback
// ---------------------------------------------------------------------------

describe('POST /api/games/:id/guesses — submit guess', () => {
  it('returns 200 with feedback array of length 5 for a valid guess', async () => {
    const game = await createGame(app);
    const res = await submitGuess(app, game.id, 'caulk');

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as GuessResponse;
    expect(body.feedback).toHaveLength(5);
  });

  it('returns exact expected feedback for answer=crane, guess=caulk', async () => {
    // answer: c(0) r(1) a(2) n(3) e(4)
    // guess:  c(0) a(1) u(2) l(3) k(4)
    // Pass1 exact: c[0]=c[0] → correct; letterCounts: c=0,r=1,a=1,n=1,e=1
    // Pass2 (positions 1-4):
    //   a→present (a in counts 1→0)
    //   u→absent
    //   l→absent
    //   k→absent
    const game = await createGame(app);
    const res = await submitGuess(app, game.id, 'caulk');

    const body = JSON.parse(res.body) as GuessResponse;
    expect(body.feedback).toEqual(['correct', 'present', 'absent', 'absent', 'absent']);
  });

  it('*** SAFETY CHECK *** answer is null in guess response while still in_progress', async () => {
    const game = await createGame(app);
    const res = await submitGuess(app, game.id, 'caulk');

    const body = JSON.parse(res.body) as GuessResponse;
    expect(body.status).toBe('in_progress');
    expect(body.answer).toBeNull();
  });

  it('*** SAFETY CHECK *** GET game also has answer=null while in_progress after a valid guess', async () => {
    const game = await createGame(app);
    await submitGuess(app, game.id, 'caulk');

    const getRes = await getGame(app, game.id);
    const gameState = JSON.parse(getRes.body) as GameState;
    expect(gameState.status).toBe('in_progress');
    expect(gameState.answer).toBeNull();
  });

  it('guess response has correct remaining count after one guess', async () => {
    const game = await createGame(app);
    const res = await submitGuess(app, game.id, 'caulk');
    const body = JSON.parse(res.body) as GuessResponse;
    expect(body.remaining).toBe(5);
    expect(body.guessNumber).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Dictionary rejection — must NOT consume a guess
// ---------------------------------------------------------------------------

describe('POST /api/games/:id/guesses — dictionary rejection', () => {
  it('returns 422 NOT_IN_DICTIONARY for a word not in the dictionary', async () => {
    const game = await createGame(app);
    // 'zzzzz' is definitely not in our stub dictionary
    const res = await submitGuess(app, game.id, 'zzzzz');

    expect(res.statusCode).toBe(422);
    const body = JSON.parse(res.body) as { error: { code: string } };
    expect(body.error.code).toBe('NOT_IN_DICTIONARY');
  });

  it('*** SAFETY CHECK *** dictionary rejection does not consume a guess (remaining unchanged)', async () => {
    const game = await createGame(app);

    // Submit an invalid word (not in dictionary)
    await submitGuess(app, game.id, 'zzzzz');

    // Verify the game state is unchanged
    const getRes = await getGame(app, game.id);
    const gameState = JSON.parse(getRes.body) as GameState;
    expect(gameState.guesses).toHaveLength(0);
    expect(gameState.remaining).toBe(6);
  });

  it('*** SAFETY CHECK *** multiple invalid guesses still leave remaining unchanged', async () => {
    const game = await createGame(app);

    await submitGuess(app, game.id, 'zzzzz');
    await submitGuess(app, game.id, 'xxxxx');

    const getRes = await getGame(app, game.id);
    const gameState = JSON.parse(getRes.body) as GameState;
    expect(gameState.guesses).toHaveLength(0);
    expect(gameState.remaining).toBe(6);
  });
});

// ---------------------------------------------------------------------------
// Wrong length — 400 INVALID_LENGTH
// ---------------------------------------------------------------------------

describe('POST /api/games/:id/guesses — invalid length', () => {
  it('returns 400 INVALID_LENGTH for a 4-letter guess', async () => {
    const game = await createGame(app);
    const res = await submitGuess(app, game.id, 'four');

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body) as { error: { code: string } };
    expect(body.error.code).toBe('INVALID_LENGTH');
  });

  it('returns 400 INVALID_LENGTH for a 6-letter guess', async () => {
    const game = await createGame(app);
    const res = await submitGuess(app, game.id, 'toolng');

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body) as { error: { code: string } };
    expect(body.error.code).toBe('INVALID_LENGTH');
  });
});

// ---------------------------------------------------------------------------
// Win flow
// ---------------------------------------------------------------------------

describe('Win flow', () => {
  it('submitting the exact answer returns status=won and reveals the answer', async () => {
    const game = await createGame(app);
    const res = await submitGuess(app, game.id, 'crane'); // exact answer

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as GuessResponse;
    expect(body.status).toBe('won');
    expect(body.answer).toBe('crane');
  });

  it('win response feedback is all-correct', async () => {
    const game = await createGame(app);
    const res = await submitGuess(app, game.id, 'crane');

    const body = JSON.parse(res.body) as GuessResponse;
    expect(body.feedback).toEqual(['correct', 'correct', 'correct', 'correct', 'correct']);
  });

  it('GET game after win also reveals answer', async () => {
    const game = await createGame(app);
    await submitGuess(app, game.id, 'crane');

    const getRes = await getGame(app, game.id);
    const gameState = JSON.parse(getRes.body) as GameState;
    expect(gameState.status).toBe('won');
    expect(gameState.answer).toBe('crane');
  });
});

// ---------------------------------------------------------------------------
// Lose flow — 6 wrong guesses
// ---------------------------------------------------------------------------

describe('Lose flow', () => {
  // 6 distinct valid words that are NOT 'crane'
  const WRONG_GUESSES = ['caulk', 'slate', 'audio', 'adieu', 'stare', 'plumb'];

  it('after 6 wrong guesses, final response has status=lost and reveals answer', async () => {
    const game = await createGame(app);

    let lastRes;
    for (const word of WRONG_GUESSES) {
      lastRes = await submitGuess(app, game.id, word);
    }

    expect(lastRes!.statusCode).toBe(200);
    const body = JSON.parse(lastRes!.body) as GuessResponse;
    expect(body.status).toBe('lost');
    expect(body.answer).toBe('crane');
  });

  it('GET game after loss also reveals answer', async () => {
    const game = await createGame(app);
    for (const word of WRONG_GUESSES) {
      await submitGuess(app, game.id, word);
    }

    const getRes = await getGame(app, game.id);
    const gameState = JSON.parse(getRes.body) as GameState;
    expect(gameState.status).toBe('lost');
    expect(gameState.answer).toBe('crane');
  });
});

// ---------------------------------------------------------------------------
// Game not found — 404
// ---------------------------------------------------------------------------

describe('GET /api/games/:id — not found', () => {
  it('returns 404 GAME_NOT_FOUND for an unknown game id', async () => {
    const res = await getGame(app, 'non-existent-game-id-00000000');

    expect(res.statusCode).toBe(404);
    const body = JSON.parse(res.body) as { error: { code: string } };
    expect(body.error.code).toBe('GAME_NOT_FOUND');
  });
});

describe('POST /api/games/:id/guesses to unknown game', () => {
  it('returns 404 GAME_NOT_FOUND when game id does not exist', async () => {
    const res = await submitGuess(app, 'non-existent-game-id-00000000', 'crane');

    expect(res.statusCode).toBe(404);
    const body = JSON.parse(res.body) as { error: { code: string } };
    expect(body.error.code).toBe('GAME_NOT_FOUND');
  });
});

// ---------------------------------------------------------------------------
// Post-game guess — 409 GAME_OVER
// ---------------------------------------------------------------------------

describe('POST /api/games/:id/guesses — game already over', () => {
  it('returns 409 GAME_OVER when guessing on a won game', async () => {
    const game = await createGame(app);
    // Win the game
    await submitGuess(app, game.id, 'crane');

    // Now try to guess again
    const res = await submitGuess(app, game.id, 'slate');

    expect(res.statusCode).toBe(409);
    const body = JSON.parse(res.body) as { error: { code: string } };
    expect(body.error.code).toBe('GAME_OVER');
  });

  it('returns 409 GAME_OVER when guessing on a lost game', async () => {
    const WRONG_GUESSES = ['caulk', 'slate', 'audio', 'adieu', 'stare', 'plumb'];

    const game = await createGame(app);
    for (const word of WRONG_GUESSES) {
      await submitGuess(app, game.id, word);
    }

    // One more guess on a lost game
    const res = await submitGuess(app, game.id, 'boxer');

    expect(res.statusCode).toBe(409);
    const body = JSON.parse(res.body) as { error: { code: string } };
    expect(body.error.code).toBe('GAME_OVER');
  });
});
