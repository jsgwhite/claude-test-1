import { useState } from 'react';
import { Board } from './components/Board.js';
import { Keyboard } from './components/Keyboard.js';
import { StatsModal } from './components/StatsModal.js';
import { SettingsPanel } from './components/SettingsPanel.js';
import { useGame } from './hooks/useGame.js';
import { useSettings } from './hooks/useSettings.js';

export default function App() {
  const { settings, saveSettings } = useSettings();
  const [showSettings, setShowSettings] = useState(false);

  const {
    rows,
    currentLetters,
    status,
    toast,
    keyStates,
    showStats,
    setShowStats,
    answer,
    wordLength,
    maxGuesses,
    handleKey,
    startGame,
  } = useGame(settings);

  return (
    <div className="min-h-screen flex flex-col items-center bg-white dark:bg-gray-900">
      {/* Header */}
      <header className="w-full border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 py-3 mb-6">
        {/* Left spacer to keep title centred */}
        <div className="w-8" />

        <h1 className="text-3xl font-bold tracking-widest uppercase select-none">
          Wordle
        </h1>

        {/* Gear / settings button */}
        <button
          onClick={() => setShowSettings(true)}
          className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100 transition-colors"
          aria-label="Open settings"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-6 h-6"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </header>

      {/* Toast */}
      <div className="h-8 flex items-center mb-4">
        {toast && (
          <div className="px-4 py-1 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg text-sm font-semibold shadow">
            {toast}
          </div>
        )}
      </div>

      {/* Board */}
      <main className="flex-1 flex flex-col items-center">
        <Board
          rows={rows}
          currentLetters={currentLetters}
          wordLength={wordLength}
          maxGuesses={maxGuesses}
        />

        {status === 'idle' && (
          <p className="mt-6 text-gray-400">Starting game…</p>
        )}
      </main>

      {/* Keyboard */}
      <div className="w-full flex justify-center pb-6 mt-6">
        <Keyboard keyStates={keyStates} onKey={handleKey} />
      </div>

      {/* Stats Modal */}
      <StatsModal
        open={showStats}
        status={status}
        answer={answer}
        onClose={() => setShowStats(false)}
        onPlayAgain={async () => {
          setShowStats(false);
          await startGame();
        }}
      />

      {/* Settings Panel */}
      <SettingsPanel
        open={showSettings}
        settings={settings}
        onSave={saveSettings}
        onClose={() => setShowSettings(false)}
      />
    </div>
  );
}
