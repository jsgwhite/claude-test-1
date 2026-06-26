/**
 * scoreGuess — pure Wordle scoring (two-pass algorithm).
 *
 * Pass 1: mark exact-position matches as 'correct' and decrement their letter
 *         count so they are not also counted as 'present'.
 * Pass 2: for every non-exact position, if the guessed letter still has a
 *         remaining count in the answer, mark it 'present' and decrement;
 *         otherwise 'absent'.
 *
 * This correctly handles duplicate letters in both the answer and the guess.
 */
import type { LetterFeedback } from '@wordle/shared';

export function scoreGuess(answer: string, guess: string): LetterFeedback[] {
  const n = answer.length;
  const result: LetterFeedback[] = new Array(n).fill('absent');

  // Build a frequency map of letters remaining in the answer.
  const letterCounts: Record<string, number> = {};
  for (const ch of answer) {
    letterCounts[ch] = (letterCounts[ch] ?? 0) + 1;
  }

  // --- Pass 1: exact matches ---
  for (let i = 0; i < n; i++) {
    if (guess[i] === answer[i]) {
      result[i] = 'correct';
      letterCounts[guess[i]]! -= 1; // consume one instance
    }
  }

  // --- Pass 2: present / absent ---
  for (let i = 0; i < n; i++) {
    if (result[i] === 'correct') continue; // already handled
    const ch = guess[i]!;
    if ((letterCounts[ch] ?? 0) > 0) {
      result[i] = 'present';
      letterCounts[ch]! -= 1;
    }
    // else: remains 'absent' (default)
  }

  return result;
}
