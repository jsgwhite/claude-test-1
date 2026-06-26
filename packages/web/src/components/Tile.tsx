import type { LetterFeedback } from '@wordle/shared';

export type TileState = LetterFeedback | 'empty' | 'typing';

interface TileProps {
  letter?: string;
  state: TileState;
}

const STATE_CLASSES: Record<TileState, string> = {
  correct: 'bg-green-600 border-green-600 text-white',
  present: 'bg-yellow-500 border-yellow-500 text-white',
  absent: 'bg-gray-600 border-gray-600 text-white',
  typing: 'bg-white border-gray-400 text-gray-900 dark:bg-gray-900 dark:text-white border-2',
  empty: 'bg-white border-gray-300 text-gray-900 dark:bg-gray-900 dark:text-white',
};

export function Tile({ letter = '', state }: TileProps) {
  return (
    <div
      data-state={state}
      className={`
        flex items-center justify-center
        w-14 h-14
        border-2 rounded
        text-2xl font-bold uppercase
        select-none
        transition-colors duration-300
        ${STATE_CLASSES[state]}
      `}
    >
      {letter}
    </div>
  );
}
