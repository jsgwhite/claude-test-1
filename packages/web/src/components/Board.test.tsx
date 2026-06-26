import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Board } from './Board.js';
import type { GuessResult } from '@wordle/shared';

const DEFAULT_WORD_LENGTH = 5;
const DEFAULT_MAX_GUESSES = 6;

function boardProps(overrides: Partial<Parameters<typeof Board>[0]> = {}) {
  return {
    rows: [],
    currentLetters: [],
    wordLength: DEFAULT_WORD_LENGTH,
    maxGuesses: DEFAULT_MAX_GUESSES,
    ...overrides,
  };
}

function getTiles(board: HTMLElement) {
  return board.querySelectorAll('[data-state]');
}

describe('Board', () => {
  it('renders 6 rows with 5 tiles each (30 tiles total) when empty', () => {
    const { container } = render(<Board {...boardProps()} />);
    const tiles = getTiles(container);
    expect(tiles).toHaveLength(DEFAULT_MAX_GUESSES * DEFAULT_WORD_LENGTH);
  });

  it('renders the board wrapper', () => {
    render(<Board {...boardProps()} />);
    expect(screen.getByTestId('board')).toBeInTheDocument();
  });

  it('shows submitted guess letters with correct colors', () => {
    const guesses: GuessResult[] = [
      {
        guess: 'crane',
        feedback: ['correct', 'absent', 'present', 'absent', 'absent'],
        guessNumber: 1,
      },
    ];
    const { container } = render(<Board {...boardProps({ rows: guesses })} />);
    const tiles = container.querySelectorAll('[data-state]');
    expect(tiles[0]).toHaveAttribute('data-state', 'correct');
    expect(tiles[1]).toHaveAttribute('data-state', 'absent');
    expect(tiles[2]).toHaveAttribute('data-state', 'present');
    expect(tiles[3]).toHaveAttribute('data-state', 'absent');
    expect(tiles[4]).toHaveAttribute('data-state', 'absent');
  });

  it('shows letters uppercased in submitted row', () => {
    const guesses: GuessResult[] = [
      {
        guess: 'crane',
        feedback: ['correct', 'correct', 'correct', 'correct', 'correct'],
        guessNumber: 1,
      },
    ];
    render(<Board {...boardProps({ rows: guesses })} />);
    expect(screen.getByText('C')).toBeInTheDocument();
    expect(screen.getByText('R')).toBeInTheDocument();
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('N')).toBeInTheDocument();
    expect(screen.getByText('E')).toBeInTheDocument();
  });

  it('renders current typing row with typing state for typed letters', () => {
    const { container } = render(
      <Board {...boardProps({ currentLetters: ['H', 'E', 'L'] })} />,
    );
    const tiles = container.querySelectorAll('[data-state]');
    expect(tiles[0]).toHaveAttribute('data-state', 'typing');
    expect(tiles[1]).toHaveAttribute('data-state', 'typing');
    expect(tiles[2]).toHaveAttribute('data-state', 'typing');
    expect(tiles[3]).toHaveAttribute('data-state', 'empty');
    expect(tiles[4]).toHaveAttribute('data-state', 'empty');
  });

  it('renders multiple submitted rows correctly', () => {
    const guesses: GuessResult[] = [
      {
        guess: 'crane',
        feedback: ['correct', 'absent', 'present', 'absent', 'absent'],
        guessNumber: 1,
      },
      {
        guess: 'stole',
        feedback: ['absent', 'absent', 'absent', 'absent', 'correct'],
        guessNumber: 2,
      },
    ];
    const { container } = render(<Board {...boardProps({ rows: guesses })} />);
    const tiles = container.querySelectorAll('[data-state]');
    expect(tiles[0]).toHaveAttribute('data-state', 'correct');
    expect(tiles[9]).toHaveAttribute('data-state', 'correct');
  });

  it('still renders correct total tile count with submitted rows', () => {
    const guesses: GuessResult[] = [
      {
        guess: 'crane',
        feedback: ['correct', 'correct', 'correct', 'correct', 'correct'],
        guessNumber: 1,
      },
    ];
    const { container } = render(<Board {...boardProps({ rows: guesses })} />);
    const tiles = getTiles(container);
    expect(tiles).toHaveLength(DEFAULT_MAX_GUESSES * DEFAULT_WORD_LENGTH);
  });

  it('renders correct tile count for a 7-letter game', () => {
    const { container } = render(
      <Board {...boardProps({ wordLength: 7, maxGuesses: 8 })} />,
    );
    const tiles = getTiles(container);
    expect(tiles).toHaveLength(7 * 8);
  });
});
