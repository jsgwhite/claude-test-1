/**
 * Zod schemas — the single runtime source of truth for the REST contract.
 * The API validates requests/responses against these; the web client can use
 * them to parse responses. TypeScript types in types.ts are kept structurally
 * compatible with these schemas.
 */
import { z } from 'zod';
import { MIN_WORD_LENGTH, MAX_WORD_LENGTH } from './types.js';

export const letterFeedbackSchema = z.enum(['correct', 'present', 'absent']);
export const gameStatusSchema = z.enum(['in_progress', 'won', 'lost']);
export const gameModeSchema = z.enum(['random']);
export const wordSourceSchema = z.enum(['bundled', 'system', 'online']);
export const difficultySchema = z.enum(['normal', 'hard']);

export const errorCodeSchema = z.enum([
  'INVALID_LENGTH',
  'NOT_IN_DICTIONARY',
  'GAME_NOT_FOUND',
  'GAME_OVER',
  'VALIDATION_ERROR',
  'INTERNAL_ERROR',
]);

export const guessResultSchema = z.object({
  guess: z.string().min(MIN_WORD_LENGTH).max(MAX_WORD_LENGTH),
  feedback: z.array(letterFeedbackSchema).min(MIN_WORD_LENGTH).max(MAX_WORD_LENGTH),
  guessNumber: z.number().int().min(1).max(MAX_WORD_LENGTH + 1),
});

export const gameStateSchema = z.object({
  id: z.string(),
  mode: gameModeSchema,
  status: gameStatusSchema,
  maxGuesses: z.number().int(),
  wordLength: z.number().int(),
  guesses: z.array(guessResultSchema),
  remaining: z.number().int().min(0),
  answer: z.string().nullable(),
  createdAt: z.string(),
});

export const guessResponseSchema = z.object({
  guess: z.string(),
  feedback: z.array(letterFeedbackSchema),
  status: gameStatusSchema,
  remaining: z.number().int().min(0),
  guessNumber: z.number().int(),
  answer: z.string().nullable(),
});

export const statsSchema = z.object({
  gamesPlayed: z.number().int(),
  gamesWon: z.number().int(),
  winPercentage: z.number(),
  currentStreak: z.number().int(),
  maxStreak: z.number().int(),
  guessDistribution: z.record(z.string(), z.number().int()),
});

export const apiErrorSchema = z.object({
  error: z.object({
    code: errorCodeSchema,
    message: z.string(),
  }),
});

/* ---- Request bodies ---- */

export const createGameBodySchema = z.object({
  mode: gameModeSchema.optional().default('random'),
  wordLength: z.number().int().min(MIN_WORD_LENGTH).max(MAX_WORD_LENGTH).optional().default(5),
  difficulty: difficultySchema.optional().default('normal'),
  wordSources: z.array(wordSourceSchema).min(1).optional().default(['bundled']),
});

export const submitGuessBodySchema = z.object({
  guess: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z]+$/, 'guess must contain only letters'),
  enableOnline: z.boolean().optional().default(false),
});

export type CreateGameBody = z.infer<typeof createGameBodySchema>;
export type SubmitGuessBody = z.infer<typeof submitGuessBodySchema>;
export type WordSourceValue = z.infer<typeof wordSourceSchema>;
export type DifficultyValue = z.infer<typeof difficultySchema>;
