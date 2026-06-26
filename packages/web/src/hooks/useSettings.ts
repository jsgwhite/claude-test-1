import { useState } from 'react';
import type { WordSource, Difficulty } from '@wordle/shared';

export interface Settings {
  wordLength: number;
  wordSources: WordSource[];
  difficulty: Difficulty;
}

export const DEFAULT_SETTINGS: Settings = {
  wordLength: 5,
  wordSources: ['bundled'],
  difficulty: 'normal',
};

const SETTINGS_KEY = 'wordle.settings';

function loadSettings(): Settings {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<Settings>;
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch {
    // corrupted storage — fall back to defaults
  }
  return { ...DEFAULT_SETTINGS };
}

export function useSettings() {
  const [settings, setSettingsState] = useState<Settings>(loadSettings);

  const saveSettings = (next: Settings) => {
    setSettingsState(next);
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
    } catch {
      // storage full or unavailable — state is still updated in memory
    }
  };

  return { settings, saveSettings };
}
