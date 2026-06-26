import type { Stats } from '@wordle/shared';
import { MAX_GUESSES } from '@wordle/shared';
import { useEffect, useState } from 'react';
import { getStats } from '../api/client.js';

interface StatsModalProps {
  open: boolean;
  status: string;
  answer: string | null;
  onClose: () => void;
  onPlayAgain: () => void;
}

export function StatsModal({ open, status, answer, onClose, onPlayAgain }: StatsModalProps) {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    if (open) {
      getStats().then(setStats).catch(() => { /* non-critical */ });
    }
  }, [open]);

  if (!open) return null;

  const maxDistValue = stats
    ? Math.max(1, ...Object.values(stats.guessDistribution))
    : 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-8 w-full max-w-sm mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold uppercase tracking-widest">Statistics</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Game result banner */}
        {answer && (
          <div className={`text-center mb-4 py-2 rounded font-semibold ${
            status === 'won'
              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
          }`}>
            {status === 'won' ? 'You got it!' : `The word was ${answer.toUpperCase()}`}
          </div>
        )}

        {/* Stats grid */}
        {stats ? (
          <>
            <div className="grid grid-cols-4 gap-2 text-center mb-6">
              {[
                { label: 'Played', value: stats.gamesPlayed },
                { label: 'Win %', value: Math.round(stats.winPercentage) },
                { label: 'Streak', value: stats.currentStreak },
                { label: 'Max', value: stats.maxStreak },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div className="text-2xl font-bold">{value}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
                </div>
              ))}
            </div>

            {/* Guess distribution */}
            <div className="mb-6">
              <h3 className="text-sm font-bold uppercase tracking-widest mb-2 text-center">
                Guess Distribution
              </h3>
              {Array.from({ length: MAX_GUESSES }).map((_, i) => {
                const key = String(i + 1);
                const count = stats.guessDistribution[key] ?? 0;
                const pct = Math.round((count / maxDistValue) * 100);
                return (
                  <div key={key} className="flex items-center gap-2 mb-1">
                    <span className="w-4 text-sm font-bold text-right">{key}</span>
                    <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden h-5">
                      <div
                        className="bg-green-600 h-full flex items-center justify-end pr-1 transition-all duration-500"
                        style={{ width: `${Math.max(pct, count > 0 ? 10 : 0)}%` }}
                      >
                        {count > 0 && (
                          <span className="text-white text-xs font-bold">{count}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="text-center text-gray-400 mb-6">Loading stats…</div>
        )}

        <button
          onClick={onPlayAgain}
          className="w-full py-3 rounded-lg bg-green-600 hover:bg-green-700 text-white font-bold uppercase tracking-widest transition-colors"
        >
          Play Again
        </button>
      </div>
    </div>
  );
}
