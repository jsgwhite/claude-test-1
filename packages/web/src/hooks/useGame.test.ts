import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useGame } from './useGame.js';

// ---------------------------------------------------------------------------
// Mock the API client module
// ---------------------------------------------------------------------------

vi.mock('../api/client.js', () => ({
  createGame: vi.fn(),
  submitGuess: vi.fn(),
  getGame: vi.fn(),
  getStats: vi.fn(),
  ApiClientError: class ApiClientError extends Error {
    code: string;
    constructor(code: string, message: string) {
      super(message);
      this.name = 'ApiClientError';
      this.code = code;
    }
  },
}));

import * as client from '../api/client.js';
import { ApiClientError } from '../api/client.js';

const mockCreateGame = vi.mocked(client.createGame);
const mockSubmitGuess = vi.mocked(client.submitGuess);

const FAKE_GAME_ID = 'test-game-id-1234';

const defaultGame = {
  id: FAKE_GAME_ID,
  mode: 'random' as const,
  status: 'in_progress' as const,
  maxGuesses: 6,
  wordLength: 5,
  guesses: [],
  remaining: 6,
  answer: null,
  createdAt: new Date().toISOString(),
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useGame', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateGame.mockResolvedValue(defaultGame);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates a game on mount and sets status to in_progress', async () => {
    const { result } = renderHook(() => useGame());

    // Wait for the async createGame to complete
    await act(async () => {
      await Promise.resolve();
    });

    expect(mockCreateGame).toHaveBeenCalledOnce();
    expect(result.current.status).toBe('in_progress');
    expect(result.current.gameId).toBe(FAKE_GAME_ID);
  });

  it('appends a letter when handleKey is called with a letter', async () => {
    const { result } = renderHook(() => useGame());
    await act(async () => { await Promise.resolve(); });

    act(() => { result.current.handleKey('H'); });
    act(() => { result.current.handleKey('E'); });
    act(() => { result.current.handleKey('L'); });

    expect(result.current.currentLetters).toEqual(['H', 'E', 'L']);
  });

  it('converts lowercase to uppercase on handleKey', async () => {
    const { result } = renderHook(() => useGame());
    await act(async () => { await Promise.resolve(); });

    act(() => { result.current.handleKey('a'); });
    expect(result.current.currentLetters).toEqual(['A']);
  });

  it('removes last letter on Backspace', async () => {
    const { result } = renderHook(() => useGame());
    await act(async () => { await Promise.resolve(); });

    act(() => { result.current.handleKey('H'); });
    act(() => { result.current.handleKey('E'); });
    act(() => { result.current.handleKey('Backspace'); });

    expect(result.current.currentLetters).toEqual(['H']);
  });

  it('does not exceed WORD_LENGTH letters', async () => {
    const { result } = renderHook(() => useGame());
    await act(async () => { await Promise.resolve(); });

    for (const letter of ['A', 'B', 'C', 'D', 'E', 'F']) {
      act(() => { result.current.handleKey(letter); });
    }

    expect(result.current.currentLetters).toHaveLength(5);
  });

  it('submits a guess and appends to rows on success', async () => {
    mockSubmitGuess.mockResolvedValue({
      guess: 'crane',
      feedback: ['correct', 'absent', 'present', 'absent', 'absent'],
      status: 'in_progress',
      remaining: 5,
      guessNumber: 1,
      answer: null,
    });

    const { result } = renderHook(() => useGame());
    await act(async () => { await Promise.resolve(); });

    // Type the word
    for (const letter of ['C', 'R', 'A', 'N', 'E']) {
      act(() => { result.current.handleKey(letter); });
    }

    // Submit
    await act(async () => {
      result.current.handleKey('Enter');
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockSubmitGuess).toHaveBeenCalledWith(FAKE_GAME_ID, 'crane', false);
    expect(result.current.rows).toHaveLength(1);
    expect(result.current.rows[0]?.guess).toBe('crane');
    expect(result.current.currentLetters).toHaveLength(0);
  });

  it('updates keyboard states after a successful guess', async () => {
    mockSubmitGuess.mockResolvedValue({
      guess: 'crane',
      feedback: ['correct', 'absent', 'present', 'absent', 'absent'],
      status: 'in_progress',
      remaining: 5,
      guessNumber: 1,
      answer: null,
    });

    const { result } = renderHook(() => useGame());
    await act(async () => { await Promise.resolve(); });

    for (const letter of ['C', 'R', 'A', 'N', 'E']) {
      act(() => { result.current.handleKey(letter); });
    }

    await act(async () => {
      result.current.handleKey('Enter');
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.keyStates['C']).toBe('correct');
    expect(result.current.keyStates['R']).toBe('absent');
    expect(result.current.keyStates['A']).toBe('present');
  });

  it('does NOT add a row when NOT_IN_DICTIONARY error is returned', async () => {
    mockSubmitGuess.mockRejectedValue(
      new ApiClientError('NOT_IN_DICTIONARY', 'Not in word list'),
    );

    const { result } = renderHook(() => useGame());
    await act(async () => { await Promise.resolve(); });

    for (const letter of ['X', 'X', 'X', 'X', 'X']) {
      act(() => { result.current.handleKey(letter); });
    }

    await act(async () => {
      result.current.handleKey('Enter');
      await Promise.resolve();
      await Promise.resolve();
    });

    // Rows must NOT grow
    expect(result.current.rows).toHaveLength(0);
    // Toast should appear
    expect(result.current.toast).toBe('Not in word list');
    // The typed letters should still be there
    expect(result.current.currentLetters).toEqual(['X', 'X', 'X', 'X', 'X']);
  });

  it('shows toast and keeps row on INVALID_LENGTH without enough letters', async () => {
    const { result } = renderHook(() => useGame());
    await act(async () => { await Promise.resolve(); });

    // Only type 3 letters
    for (const letter of ['A', 'B', 'C']) {
      act(() => { result.current.handleKey(letter); });
    }

    await act(async () => {
      result.current.handleKey('Enter');
      await Promise.resolve();
    });

    // No guess submitted
    expect(mockSubmitGuess).not.toHaveBeenCalled();
    expect(result.current.rows).toHaveLength(0);
    expect(result.current.toast).toBe('Not enough letters');
  });

  it('sets status to won when game is won', async () => {
    mockSubmitGuess.mockResolvedValue({
      guess: 'crane',
      feedback: ['correct', 'correct', 'correct', 'correct', 'correct'],
      status: 'won',
      remaining: 0,
      guessNumber: 1,
      answer: 'crane',
    });

    const { result } = renderHook(() => useGame());
    await act(async () => { await Promise.resolve(); });

    for (const letter of ['C', 'R', 'A', 'N', 'E']) {
      act(() => { result.current.handleKey(letter); });
    }

    await act(async () => {
      result.current.handleKey('Enter');
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.status).toBe('won');
    expect(result.current.answer).toBe('crane');
    expect(result.current.showStats).toBe(true);
  });

  it('correct key state is preserved over present (priority)', async () => {
    // First guess: A is present
    mockSubmitGuess.mockResolvedValueOnce({
      guess: 'crane',
      feedback: ['present', 'absent', 'absent', 'absent', 'absent'],
      status: 'in_progress',
      remaining: 5,
      guessNumber: 1,
      answer: null,
    });
    // Second guess: A is correct
    mockSubmitGuess.mockResolvedValueOnce({
      guess: 'crave',
      feedback: ['correct', 'absent', 'absent', 'absent', 'absent'],
      status: 'in_progress',
      remaining: 4,
      guessNumber: 2,
      answer: null,
    });

    const { result } = renderHook(() => useGame());
    await act(async () => { await Promise.resolve(); });

    // First guess
    for (const l of ['C', 'R', 'A', 'N', 'E']) act(() => result.current.handleKey(l));
    await act(async () => { result.current.handleKey('Enter'); await Promise.resolve(); await Promise.resolve(); });

    expect(result.current.keyStates['C']).toBe('present');

    // Second guess
    for (const l of ['C', 'R', 'A', 'V', 'E']) act(() => result.current.handleKey(l));
    await act(async () => { result.current.handleKey('Enter'); await Promise.resolve(); await Promise.resolve(); });

    // correct should win over present
    expect(result.current.keyStates['C']).toBe('correct');
  });
});
