import type { WordSource, Difficulty } from '@wordle/shared';
import { MIN_WORD_LENGTH, MAX_WORD_LENGTH } from '@wordle/shared';
import type { Settings } from '../hooks/useSettings.js';

interface SettingsPanelProps {
  open: boolean;
  settings: Settings;
  onSave: (s: Settings) => void;
  onClose: () => void;
}

const SOURCE_LABELS: Record<WordSource, { label: string; description: string }> = {
  bundled: {
    label: 'Bundled Wordle list',
    description: '~200 common English words — the classic Wordle experience',
  },
  system: {
    label: 'System dictionary',
    description: '/usr/share/dict/words — ~8 700 words, includes more obscure terms',
  },
  online: {
    label: 'Online validation',
    description: 'Validate unknown guesses via dictionaryapi.dev (adds ~150 ms)',
  },
};

const ALL_SOURCES: WordSource[] = ['bundled', 'system', 'online'];
const WORD_LENGTHS = Array.from(
  { length: MAX_WORD_LENGTH - MIN_WORD_LENGTH + 1 },
  (_, i) => MIN_WORD_LENGTH + i,
);

export function SettingsPanel({ open, settings, onSave, onClose }: SettingsPanelProps) {
  if (!open) return null;

  function toggleSource(src: WordSource, checked: boolean) {
    const next = checked
      ? ([...settings.wordSources, src] as WordSource[])
      : settings.wordSources.filter((s) => s !== src);
    // Keep at least one source selected.
    if (next.length === 0) return;
    onSave({ ...settings, wordSources: next });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-8 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold uppercase tracking-widest">Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl leading-none"
            aria-label="Close settings"
          >
            ×
          </button>
        </div>

        {/* ── Word Sources ── */}
        <section className="mb-6">
          <h3 className="text-sm font-bold uppercase tracking-widest mb-3 text-gray-500 dark:text-gray-400">
            Word Sources
          </h3>
          <div className="space-y-3">
            {ALL_SOURCES.map((src) => {
              const checked = settings.wordSources.includes(src);
              const isLast = settings.wordSources.length === 1 && checked;
              return (
                <label
                  key={src}
                  className={`flex items-start gap-3 cursor-pointer rounded-lg p-3 border transition-colors ${
                    checked
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-500'
                  } ${isLast ? 'opacity-60' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={isLast}
                    onChange={(e) => toggleSource(src, e.target.checked)}
                    className="mt-0.5 accent-green-600"
                  />
                  <div>
                    <div className="font-medium text-sm">{SOURCE_LABELS[src].label}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {SOURCE_LABELS[src].description}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        </section>

        {/* ── Word Length ── */}
        <section className="mb-6">
          <h3 className="text-sm font-bold uppercase tracking-widest mb-1 text-gray-500 dark:text-gray-400">
            Word Length
          </h3>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
            Guesses allowed = word length + 1
          </p>
          <div className="flex gap-2 flex-wrap">
            {WORD_LENGTHS.map((len) => (
              <button
                key={len}
                onClick={() => onSave({ ...settings, wordLength: len })}
                className={`w-10 h-10 rounded-lg font-bold text-sm transition-colors ${
                  settings.wordLength === len
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {len}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
            Current: {settings.wordLength} letters → {settings.wordLength + 1} guesses
          </p>
        </section>

        {/* ── Difficulty ── */}
        <section className="mb-6">
          <h3 className="text-sm font-bold uppercase tracking-widest mb-3 text-gray-500 dark:text-gray-400">
            Difficulty
          </h3>
          <div className="space-y-2">
            {(
              [
                {
                  value: 'normal' as Difficulty,
                  label: 'Normal',
                  desc: 'Answers chosen from common, well-known words',
                },
                {
                  value: 'hard' as Difficulty,
                  label: 'Hard',
                  desc: 'Answers may include obscure words from the system dictionary',
                },
              ] as const
            ).map(({ value, label, desc }) => (
              <label
                key={value}
                className={`flex items-start gap-3 cursor-pointer rounded-lg p-3 border transition-colors ${
                  settings.difficulty === value
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-500'
                }`}
              >
                <input
                  type="radio"
                  name="difficulty"
                  value={value}
                  checked={settings.difficulty === value}
                  onChange={() => onSave({ ...settings, difficulty: value })}
                  className="mt-0.5 accent-green-600"
                />
                <div>
                  <div className="font-medium text-sm">{label}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{desc}</div>
                </div>
              </label>
            ))}
          </div>
        </section>

        <p className="text-xs text-center text-gray-400 dark:text-gray-500">
          Settings take effect on your next new game.
        </p>
      </div>
    </div>
  );
}
