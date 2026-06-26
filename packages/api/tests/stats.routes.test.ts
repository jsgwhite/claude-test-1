/**
 * Integration tests for the stats routes.
 *
 * Uses in-memory repos + a deterministic WordList stub (answer = 'crane').
 * Verifies that stats are correctly aggregated after completing a game.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import type { Stats } from '@wordle/shared';
import {
  makeApp,
  createGame,
  submitGuess,
  getStats,
  TEST_PLAYER_ID,
} from './helpers.js';

let app: FastifyInstance;

beforeEach(async () => {
  ({ app } = await makeApp({ answer: 'crane' }));
});

// ---------------------------------------------------------------------------
// Fresh player — all zeros
// ---------------------------------------------------------------------------

describe('GET /api/stats — fresh player', () => {
  it('returns all-zero stats for a player with no games', async () => {
    const res = await getStats(app, 'brand-new-player-00000000-0000-0000-0000');

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as Stats;
    expect(body.gamesPlayed).toBe(0);
    expect(body.gamesWon).toBe(0);
    expect(body.winPercentage).toBe(0);
    expect(body.currentStreak).toBe(0);
    expect(body.maxStreak).toBe(0);
  });

  it('guess distribution is all zeros for a fresh player', async () => {
    const res = await getStats(app, 'brand-new-player-00000000-0000-0000-0000');
    const body = JSON.parse(res.body) as Stats;

    // All 6 buckets should be 0
    for (let i = 1; i <= 6; i++) {
      expect(body.guessDistribution[String(i)]).toBe(0);
    }
  });
});

// ---------------------------------------------------------------------------
// After winning a game
// ---------------------------------------------------------------------------

describe('GET /api/stats — after a winning game', () => {
  it('gamesPlayed=1, gamesWon=1, winPercentage=100, currentStreak=1 after one win', async () => {
    // Play and win in 2 guesses: caulk (wrong), crane (correct = win on guess 2)
    const game = await createGame(app, TEST_PLAYER_ID);
    await submitGuess(app, game.id, 'caulk'); // guess 1 — wrong
    await submitGuess(app, game.id, 'crane'); // guess 2 — win

    const res = await getStats(app, TEST_PLAYER_ID);
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as Stats;

    expect(body.gamesPlayed).toBe(1);
    expect(body.gamesWon).toBe(1);
    expect(body.winPercentage).toBe(100);
    expect(body.currentStreak).toBe(1);
  });

  it('guessDistribution bucket for guess count is incremented after win', async () => {
    // Win in 2 guesses → bucket '2' should be 1
    const game = await createGame(app, TEST_PLAYER_ID);
    await submitGuess(app, game.id, 'caulk'); // guess 1
    await submitGuess(app, game.id, 'crane'); // guess 2 = win

    const res = await getStats(app, TEST_PLAYER_ID);
    const body = JSON.parse(res.body) as Stats;

    expect(body.guessDistribution['2']).toBe(1);
    // Other buckets untouched
    expect(body.guessDistribution['1']).toBe(0);
    expect(body.guessDistribution['3']).toBe(0);
    expect(body.guessDistribution['6']).toBe(0);
  });

  it('win on first guess increments bucket "1"', async () => {
    const game = await createGame(app, TEST_PLAYER_ID);
    await submitGuess(app, game.id, 'crane'); // guess 1 = win

    const res = await getStats(app, TEST_PLAYER_ID);
    const body = JSON.parse(res.body) as Stats;

    expect(body.gamesPlayed).toBe(1);
    expect(body.gamesWon).toBe(1);
    expect(body.guessDistribution['1']).toBe(1);
    expect(body.currentStreak).toBe(1);
  });

  it('stats are isolated per player id', async () => {
    const PLAYER_A = 'player-a-00000000-0000-0000-0000-000000000001';
    const PLAYER_B = 'player-b-00000000-0000-0000-0000-000000000002';

    // Player A wins
    const gameA = await createGame(app, PLAYER_A);
    await submitGuess(app, gameA.id, 'crane', PLAYER_A);

    // Player B has no games yet
    const resB = await getStats(app, PLAYER_B);
    const statsB = JSON.parse(resB.body) as Stats;
    expect(statsB.gamesPlayed).toBe(0);

    // Player A has 1 win
    const resA = await getStats(app, PLAYER_A);
    const statsA = JSON.parse(resA.body) as Stats;
    expect(statsA.gamesPlayed).toBe(1);
    expect(statsA.gamesWon).toBe(1);
  });
});
