/**
 * Drizzle/SQLite implementation of GameRepository.
 *
 * Feedback (LetterFeedback[]) is serialized as a JSON string in the guesses
 * table and parsed back on read.
 */
import { eq, asc } from 'drizzle-orm';
import type {
  GameRepository,
  GameWithGuesses,
  GuessRecord,
  NewGameInput,
  NewGuessInput,
} from '../GameRepository.js';
import type { GameStatus, LetterFeedback } from '@wordle/shared';
import type { DrizzleDb } from './client.js';
import { games, guesses } from './schema.js';

export class DrizzleGameRepository implements GameRepository {
  constructor(private readonly db: DrizzleDb) {}

  async create(input: NewGameInput): Promise<GameWithGuesses> {
    const now = new Date().toISOString();
    await this.db.insert(games).values({
      id: input.id,
      playerId: input.playerId,
      mode: input.mode,
      answer: input.answer,
      status: 'in_progress',
      maxGuesses: input.maxGuesses,
      wordLength: input.wordLength,
      createdAt: now,
      updatedAt: now,
    });

    return {
      id: input.id,
      playerId: input.playerId,
      mode: input.mode,
      answer: input.answer,
      status: 'in_progress',
      maxGuesses: input.maxGuesses,
      wordLength: input.wordLength,
      createdAt: now,
      updatedAt: now,
      guesses: [],
    };
  }

  async findById(id: string): Promise<GameWithGuesses | null> {
    const [game] = await this.db
      .select()
      .from(games)
      .where(eq(games.id, id))
      .limit(1);

    if (!game) return null;

    const rows = await this.db
      .select()
      .from(guesses)
      .where(eq(guesses.gameId, id))
      .orderBy(asc(guesses.guessNumber));

    const guessRecords: GuessRecord[] = rows.map((r) => ({
      guessNumber: r.guessNumber,
      word: r.word,
      feedback: JSON.parse(r.feedback) as LetterFeedback[],
      createdAt: r.createdAt,
    }));

    return {
      id: game.id,
      playerId: game.playerId ?? null,
      mode: game.mode as GameWithGuesses['mode'],
      answer: game.answer,
      status: game.status as GameStatus,
      maxGuesses: game.maxGuesses,
      wordLength: game.wordLength,
      createdAt: game.createdAt,
      updatedAt: game.updatedAt,
      guesses: guessRecords,
    };
  }

  async appendGuess(gameId: string, guess: NewGuessInput): Promise<void> {
    const now = new Date().toISOString();
    await this.db.insert(guesses).values({
      gameId,
      guessNumber: guess.guessNumber,
      word: guess.word,
      feedback: JSON.stringify(guess.feedback),
      createdAt: now,
    });
    await this.db
      .update(games)
      .set({ updatedAt: now })
      .where(eq(games.id, gameId));
  }

  async updateStatus(gameId: string, status: GameStatus): Promise<void> {
    const now = new Date().toISOString();
    await this.db
      .update(games)
      .set({ status, updatedAt: now })
      .where(eq(games.id, gameId));
  }

  async ping(): Promise<void> {
    // A trivial synchronous query; if the DB is open, this succeeds.
    this.db.select().from(games).limit(1);
  }
}
