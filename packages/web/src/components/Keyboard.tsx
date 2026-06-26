import type { KeyState } from '../hooks/useGame.js';

interface KeyboardProps {
  keyStates: Record<string, KeyState>;
  onKey: (key: string) => void;
}

const ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Enter', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'Backspace'],
];

const KEY_STATE_CLASSES: Record<KeyState, string> = {
  correct: 'bg-green-600 text-white border-green-600',
  present: 'bg-yellow-500 text-white border-yellow-500',
  absent: 'bg-gray-500 text-white border-gray-500',
  unused: 'bg-gray-200 text-gray-900 border-gray-300 dark:bg-gray-700 dark:text-white dark:border-gray-600',
};

interface KeyProps {
  label: string;
  state: KeyState;
  onKey: (key: string) => void;
}

function Key({ label, state, onKey }: KeyProps) {
  const isWide = label === 'Enter' || label === 'Backspace';
  const displayLabel = label === 'Backspace' ? '⌫' : label;

  return (
    <button
      className={`
        flex items-center justify-center
        ${isWide ? 'px-3 min-w-[4rem]' : 'w-10'}
        h-14 rounded
        text-sm font-bold uppercase
        border
        cursor-pointer
        select-none
        transition-colors duration-200
        ${KEY_STATE_CLASSES[state]}
      `}
      onClick={() => onKey(label)}
      aria-label={label}
    >
      {displayLabel}
    </button>
  );
}

export function Keyboard({ keyStates, onKey }: KeyboardProps) {
  return (
    <div className="flex flex-col gap-1.5 items-center">
      {ROWS.map((row, rowIdx) => (
        <div key={rowIdx} className="flex gap-1.5">
          {row.map((key) => (
            <Key
              key={key}
              label={key}
              state={keyStates[key] ?? 'unused'}
              onKey={onKey}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
