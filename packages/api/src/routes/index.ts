/**
 * routesPlugin — registers all game + stats REST routes under /api.
 *
 * Endpoints:
 *   POST   /api/games              → 201 GameState
 *   GET    /api/games/:id          → 200 GameState
 *   POST   /api/games/:id/guesses  → 200 GuessResponse
 *   GET    /api/stats              → 200 Stats
 *
 * Error cases are surfaced by throwing AppError; the global error handler
 * (in diagnostics.ts) converts them to the { error: { code, message } } envelope.
 */
import type { FastifyPluginAsync } from 'fastify';
import type { ServerDeps } from '../server.js';
import type {
  GameState,
  GuessResponse,
  GameStatus,
  GameMode,
  Difficulty,
} from '@wordle/shared';
import {
  PLAYER_ID_HEADER,
  ROUTES,
  STATUS,
  WORD_LENGTH,
  MIN_WORD_LENGTH,
  MAX_WORD_LENGTH,
} from '@wordle/shared';
import type { GameWithGuesses } from '../repositories/GameRepository.js';
import { errors } from '../errors.js';
import { scoreGuess } from '../domain/scoring.js';

export interface RoutesOptions {
  deps: ServerDeps;
}

// ---------------------------------------------------------------------------
// Helper: convert a persisted GameWithGuesses to the client-facing GameState.
// The answer is nulled out while the game is in progress.
// ---------------------------------------------------------------------------
export function toGameState(game: GameWithGuesses): GameState {
  return {
    id: game.id,
    mode: game.mode as GameMode,
    status: game.status as GameStatus,
    maxGuesses: game.maxGuesses,
    wordLength: game.wordLength,
    guesses: game.guesses.map((g) => ({
      guess: g.word,
      feedback: g.feedback,
      guessNumber: g.guessNumber,
    })),
    remaining: game.maxGuesses - game.guesses.length,
    answer: game.status !== 'in_progress' ? game.answer : null,
    createdAt: game.createdAt,
  };
}

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------
export const routesPlugin: FastifyPluginAsync<RoutesOptions> = async (app, opts) => {
  const { gameRepo, statsRepo, wordList } = opts.deps;

  // ------------------------------------------------------------------
  // POST /api/games  — create a new game
  // ------------------------------------------------------------------
  app.post(ROUTES.createGame, async (request, reply) => {
    const playerId = (request.headers[PLAYER_ID_HEADER] as string | undefined) ?? null;

    // Parse optional game settings from body.
    const body = (request.body ?? {}) as {
      wordLength?: unknown;
      difficulty?: unknown;
    };
    const wordLength = (
      typeof body.wordLength === 'number' &&
      body.wordLength >= MIN_WORD_LENGTH &&
      body.wordLength <= MAX_WORD_LENGTH
    )
      ? Math.round(body.wordLength)
      : WORD_LENGTH;

    const difficulty: Difficulty =
      body.difficulty === 'hard' ? 'hard' : 'normal';

    // maxGuesses scales with word length: longer words get one extra guess.
    const maxGuesses = wordLength + 1;

    // Pick answer using the requested settings.
    const answer = wordList.randomAnswer({ wordLength, difficulty });

    const id = crypto.randomUUID();
    const game = await gameRepo.create({
      id,
      playerId,
      mode: 'random',
      answer,
      maxGuesses,
      wordLength,
    });

    request.log.info({ event: 'game_created', gameId: id, playerId, wordLength, difficulty });

    return reply.status(STATUS.CREATED).send(toGameState(game));
  });

  // ------------------------------------------------------------------
  // GET /api/games/:id  — fetch existing game state
  // ------------------------------------------------------------------
  app.get<{ Params: { id: string } }>(ROUTES.getGame, async (request, reply) => {
    const { id } = request.params;
    const game = await gameRepo.findById(id);
    if (!game) throw errors.gameNotFound();

    return reply.status(STATUS.OK).send(toGameState(game));
  });

  // ------------------------------------------------------------------
  // POST /api/games/:id/guesses  — submit a guess
  // ------------------------------------------------------------------
  app.post<{
    Params: { id: string };
    Body: { guess: string; enableOnline?: boolean };
  }>(ROUTES.submitGuess, async (request, reply) => {
    const { id } = request.params;
    const playerId = (request.headers[PLAYER_ID_HEADER] as string | undefined) ?? null;

    // Normalize: lowercase + trim.
    const rawGuess: string = (request.body as { guess: string; enableOnline?: boolean }).guess;
    const enableOnline = (request.body as { enableOnline?: boolean }).enableOnline === true;
    const guess = rawGuess.toLowerCase().trim();

    // Load game.
    const game = await gameRepo.findById(id);
    if (!game) throw errors.gameNotFound();

    // Check game is still in progress.
    if (game.status !== 'in_progress') throw errors.gameOver();

    // Validate length against this game's word length.
    if (guess.length !== game.wordLength) throw errors.invalidLength();

    // Validate dictionary — must NOT persist if invalid.
    if (!await wordList.isValidGuess(guess, { enableOnline })) throw errors.notInDictionary();

    // Score the guess.
    const feedback = scoreGuess(game.answer, guess);

    // Persist guess.
    const guessNumber = game.guesses.length + 1;
    await gameRepo.appendGuess(id, { guessNumber, word: guess, feedback });

    // Determine new status.
    let newStatus: GameStatus = 'in_progress';
    const won = guess === game.answer;
    if (won) {
      newStatus = 'won';
    } else if (guessNumber >= game.maxGuesses) {
      newStatus = 'lost';
    }

    // Persist status change if game ended.
    if (newStatus !== 'in_progress') {
      await gameRepo.updateStatus(id, newStatus);
      // Record result for stats.
      const effectivePlayerId = playerId ?? 'anonymous';
      await statsRepo.recordResult(effectivePlayerId, {
        won,
        guessCount: guessNumber,
      });
    }

    const remaining = game.maxGuesses - guessNumber;
    const answerRevealed = newStatus !== 'in_progress' ? game.answer : null;

    request.log.info({
      event: 'guess_scored',
      gameId: id,
      guessNumber,
      status: newStatus,
    });

    const response: GuessResponse = {
      guess,
      feedback,
      status: newStatus,
      remaining,
      guessNumber,
      answer: answerRevealed,
    };

    return reply.status(STATUS.OK).send(response);
  });

  // ------------------------------------------------------------------
  // GET /api/stats  — fetch player stats (never 404)
  // ------------------------------------------------------------------
  app.get(ROUTES.stats, async (request, reply) => {
    const playerId =
      (request.headers[PLAYER_ID_HEADER] as string | undefined) ?? 'anonymous';
    const stats = await statsRepo.get(playerId);
    return reply.status(STATUS.OK).send(stats);
  });
};
