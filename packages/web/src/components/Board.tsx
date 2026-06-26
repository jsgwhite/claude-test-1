import type { GuessResult } from '@wordle/shared';
import { Row } from './Row.js';

interface BoardProps {
  rows: GuessResult[];
  currentLetters: string[];
  wordLength: number;
  maxGuesses: number;
}

export function Board({ rows, currentLetters, wordLength, maxGuesses }: BoardProps) {
  const emptyCount = maxGuesses - rows.length - 1;

  return (
    <div className="flex flex-col gap-1.5" data-testid="board">
      {rows.map((result) => (
        <Row key={result.guessNumber} result={result} wordLength={wordLength} />
      ))}

      {rows.length < maxGuesses && (
        <Row currentLetters={currentLetters} wordLength={wordLength} />
      )}

      {emptyCount > 0 &&
        Array.from({ length: emptyCount }).map((_, i) => (
          <Row key={`empty-${i}`} wordLength={wordLength} />
        ))}
    </div>
  );
}
