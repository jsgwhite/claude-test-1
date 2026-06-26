import type { GuessResult } from '@wordle/shared';
import { Tile } from './Tile.js';
import type { TileState } from './Tile.js';

interface RowProps {
  wordLength: number;
  result?: GuessResult;
  currentLetters?: string[];
}

export function Row({ wordLength, result, currentLetters }: RowProps) {
  return (
    <div className="flex gap-1.5">
      {Array.from({ length: wordLength }).map((_, i) => {
        let letter = '';
        let state: TileState = 'empty';

        if (result) {
          letter = result.guess[i]?.toUpperCase() ?? '';
          state = result.feedback[i] ?? 'absent';
        } else if (currentLetters) {
          letter = currentLetters[i] ?? '';
          state = letter ? 'typing' : 'empty';
        }

        return <Tile key={i} letter={letter} state={state} />;
      })}
    </div>
  );
}
