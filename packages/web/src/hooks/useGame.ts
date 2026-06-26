import { useCallback, useEffect, useReducer, useRef } from 'react';
import type { GameStatus, GuessResult, LetterFeedback } from '@wordle/shared';
import * as client from '../api/client.js';
import { ApiClientError } from '../api/client.js';
import type { Settings } from './useSettings.js';
import { DEFAULT_SETTINGS } from './useSettings.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type KeyState = LetterFeedback | 'unused';

export interface GameState {
  gameId: string | null;
  rows: GuessResult[];
  currentLetters: string[];
  status: GameStatus | 'idle';
  toast: string | null;
  keyStates: Record<string, KeyState>;
  showStats: boolean;
  answer: string | null;
  /** Word length for the active game (confirmed from the API response). */
  wordLength: number;
  /** Max guesses for the active game (confirmed from the API response). */
  maxGuesses: number;
}

type Action =
  | { type: 'GAME_CREATED'; gameId: string; wordLength: number; maxGuesses: number }
  | { type: 'TYPE_LETTER'; letter: string }
  | { type: 'BACKSPACE' }
  | { type: 'GUESS_SUCCESS'; result: GuessResult; status: GameStatus; remaining: number; answer: string | null }
  | { type: 'TOAST'; message: string | null }
  | { type: 'SHOW_STATS'; show: boolean }
  | { type: 'NEW_GAME'; wordLength: number; maxGuesses: number };

// ---------------------------------------------------------------------------
// Keyboard coloring
// ---------------------------------------------------------------------------

const FEEDBACK_PRIORITY: Record<KeyState, number> = {
  correct: 3,
  present: 2,
  absent: 1,
  unused: 0,
};

function bestState(a: KeyState, b: KeyState): KeyState {
  return FEEDBACK_PRIORITY[a] >= FEEDBACK_PRIORITY[b] ? a : b;
}

function updateKeyStates(
  current: Record<string, KeyState>,
  result: GuessResult,
): Record<string, KeyState> {
  const updated = { ...current };
  result.guess.split('').forEach((letter, i) => {
    const fb = result.feedback[i];
    const key = letter.toUpperCase();
    updated[key] = bestState(updated[key] ?? 'unused', fb);
  });
  return updated;
}

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

function makeInitialState(wordLength: number, maxGuesses: number): GameState {
  return {
    gameId: null,
    rows: [],
    currentLetters: [],
    status: 'idle',
    toast: null,
    keyStates: {},
    showStats: false,
    answer: null,
    wordLength,
    maxGuesses,
  };
}

function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'GAME_CREATED':
      return {
        ...makeInitialState(action.wordLength, action.maxGuesses),
        gameId: action.gameId,
        status: 'in_progress',
      };

    case 'TYPE_LETTER': {
      if (state.status !== 'in_progress') return state;
      if (state.currentLetters.length >= state.wordLength) return state;
      return { ...state, currentLetters: [...state.currentLetters, action.letter], toast: null };
    }

    case 'BACKSPACE': {
      if (state.status !== 'in_progress') return state;
      return { ...state, currentLetters: state.currentLetters.slice(0, -1), toast: null };
    }

    case 'GUESS_SUCCESS': {
      const newRows = [...state.rows, action.result];
      const newKeyStates = updateKeyStates(state.keyStates, action.result);
      const gameOver = action.status === 'won' || action.status === 'lost';
      return {
        ...state,
        rows: newRows,
        currentLetters: [],
        status: action.status,
        keyStates: newKeyStates,
        answer: action.answer,
        showStats: gameOver,
        toast: null,
      };
    }

    case 'TOAST':
      return { ...state, toast: action.message };

    case 'SHOW_STATS':
      return { ...state, showStats: action.show };

    case 'NEW_GAME':
      return makeInitialState(action.wordLength, action.maxGuesses);

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useGame(settings: Settings = DEFAULT_SETTINGS) {
  const [state, dispatch] = useReducer(
    reducer,
    makeInitialState(settings.wordLength, settings.wordLength + 1),
  );
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const submittingRef = useRef(false);

  const showToast = useCallback((message: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    dispatch({ type: 'TOAST', message });
    toastTimerRef.current = setTimeout(() => {
      dispatch({ type: 'TOAST', message: null });
    }, 2000);
  }, []);

  const startGame = useCallback(async () => {
    const wl = settings.wordLength;
    const mg = wl + 1;
    dispatch({ type: 'NEW_GAME', wordLength: wl, maxGuesses: mg });
    try {
      const game = await client.createGame({
        wordLength: settings.wordLength,
        difficulty: settings.difficulty,
        wordSources: settings.wordSources,
      });
      dispatch({
        type: 'GAME_CREATED',
        gameId: game.id,
        wordLength: game.wordLength,
        maxGuesses: game.maxGuesses,
      });
    } catch {
      showToast('Failed to start game. Please try again.');
    }
  }, [settings, showToast]);

  useEffect(() => {
    void startGame();
    // Run once on mount only — settings changes take effect when Play Again is clicked.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submitGuess = useCallback(async () => {
    const { gameId, currentLetters, status, wordLength } = state;
    if (!gameId || status !== 'in_progress' || submittingRef.current) return;
    if (currentLetters.length < wordLength) {
      showToast('Not enough letters');
      return;
    }
    const guess = currentLetters.join('').toLowerCase();
    const enableOnline = settings.wordSources.includes('online');
    submittingRef.current = true;
    try {
      const result = await client.submitGuess(gameId, guess, enableOnline);
      dispatch({
        type: 'GUESS_SUCCESS',
        result: { guess: result.guess, feedback: result.feedback, guessNumber: result.guessNumber },
        status: result.status,
        remaining: result.remaining,
        answer: result.answer,
      });
    } catch (err) {
      if (err instanceof ApiClientError) {
        if (err.code === 'NOT_IN_DICTIONARY') showToast('Not in word list');
        else if (err.code === 'INVALID_LENGTH') showToast('Not enough letters');
        else showToast(err.message);
      } else {
        showToast('Something went wrong');
      }
    } finally {
      submittingRef.current = false;
    }
  }, [state, settings.wordSources, showToast]);

  const handleKey = useCallback(
    (key: string) => {
      if (state.status !== 'in_progress') return;
      if (key === 'Enter') void submitGuess();
      else if (key === 'Backspace') dispatch({ type: 'BACKSPACE' });
      else if (/^[a-zA-Z]$/.test(key)) dispatch({ type: 'TYPE_LETTER', letter: key.toUpperCase() });
    },
    [state.status, submitGuess],
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      handleKey(e.key);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleKey]);

  return {
    ...state,
    remaining: state.maxGuesses - state.rows.length,
    handleKey,
    startGame,
    setShowStats: (show: boolean) => dispatch({ type: 'SHOW_STATS', show }),
  };
}
