/**
 * WordList — supplies secret answers and validates guesses.
 *
 * Three sources, each optional at runtime:
 *   bundled  — curated common 5-letter Wordle words (always available)
 *   system   — /usr/share/dict/words filtered to N-letter words (loaded at startup)
 *   online   — dictionaryapi.dev used as fallback for words not found locally
 *
 * Call loadSystemWords() at startup and pass the result into buildWordList().
 * The online cache (onlineCache) lives for the process lifetime.
 */
import { readFileSync } from 'fs';
import type { Difficulty } from '@wordle/shared';

export interface WordList {
  randomAnswer(opts: { wordLength: number; difficulty: Difficulty }): string;
  /** Returns true if the word is a valid guess.
   *  enableOnline: when true, words not in any local dict are checked via the
   *  Free Dictionary API as a last resort. */
  isValidGuess(word: string, opts?: { enableOnline?: boolean }): Promise<boolean>;
}

// ---------------------------------------------------------------------------
// Bundled answer pool — 200 common, well-known 5-letter English words.
// Only used when wordLength === 5.
// ---------------------------------------------------------------------------
const ANSWER_WORDS: readonly string[] = [
  'abbey', 'abyss', 'acute', 'agent', 'agile', 'aglow', 'agree', 'ahead',
  'aided', 'aisle', 'alert', 'alike', 'alive', 'allay', 'alley', 'allot',
  'allow', 'alloy', 'alone', 'aloof', 'alter', 'ample', 'angel', 'anger',
  'angle', 'annex', 'apart', 'apple', 'apply', 'apron', 'aptly', 'arbor',
  'ardor', 'argue', 'arise', 'armor', 'aroma', 'arose', 'array', 'arson',
  'aside', 'askew', 'assay', 'atone', 'attic', 'audio', 'audit', 'augur',
  'avail', 'avid', 'awake', 'award', 'aware', 'awful', 'basic', 'basis',
  'baste', 'batch', 'bathe', 'bayou', 'beach', 'beard', 'beast', 'begin',
  'being', 'below', 'bench', 'binge', 'birch', 'black', 'blade', 'blame',
  'bland', 'blank', 'blaze', 'bleak', 'bleed', 'blend', 'bless', 'blimp',
  'blind', 'bliss', 'block', 'bloom', 'blown', 'board', 'boast', 'bound',
  'brace', 'braid', 'brain', 'brake', 'brand', 'brave', 'brawn', 'bread',
  'break', 'breed', 'breve', 'brick', 'bride', 'brief', 'bring', 'brisk',
  'broil', 'brook', 'brown', 'brunt', 'brush', 'build', 'bulge', 'bulky',
  'bully', 'burns', 'burst', 'cable', 'camel', 'candy', 'carry', 'carve',
  'catch', 'cause', 'cease', 'chain', 'chair', 'chalk', 'champ', 'chard',
  'charm', 'chart', 'chase', 'chasm', 'cheap', 'cheat', 'cheek', 'cheer',
  'chess', 'chest', 'chief', 'child', 'chime', 'chimp', 'choir', 'choke',
  'chomp', 'chord', 'civil', 'claim', 'clamp', 'clasp', 'class', 'clave',
  'clean', 'clear', 'clerk', 'click', 'cliff', 'climb', 'cling', 'clink',
  'cloak', 'clock', 'clone', 'close', 'cloth', 'cloud', 'clout', 'coach',
  'coast', 'comet', 'comic', 'comma', 'coral', 'coven', 'cover', 'craft',
  'cramp', 'crane', 'crate', 'crawl', 'creak', 'creek', 'crest', 'crimp',
  'crisp', 'croak', 'crone', 'cross', 'croup', 'crowd', 'crown', 'cruel',
  'crush', 'crust', 'crypt', 'cubic', 'curly', 'curve', 'cycle', 'daily',
];

// Extended valid-guess list for 5-letter games — accepted guesses but not answer candidates.
const EXTRA_VALID_5: readonly string[] = [
  'aalii', 'abaci', 'aback', 'abaft', 'abase', 'abash', 'abate', 'abbot',
  'abhor', 'abide', 'abler', 'abode', 'abori', 'about', 'above', 'abuzz',
  'adage', 'adapt', 'addax', 'added', 'adder', 'adieu', 'admit', 'adobe',
  'adopt', 'adore', 'adorn', 'adult', 'affix', 'afoot', 'afoul', 'after',
  'again', 'agate', 'agave', 'agaze', 'agene', 'agism', 'aging', 'agist',
  'agone', 'agony', 'ailed', 'aimed', 'aired', 'album', 'alcid', 'aldol',
  'aleph', 'algae', 'alibi', 'alien', 'align', 'aloud', 'alpha', 'altar',
  'altho', 'alula', 'alums', 'amber', 'amble', 'amend', 'amiss', 'amity',
  'among', 'amour', 'amuck', 'amuse', 'anear', 'anele', 'anew', 'angst',
  'anime', 'anise', 'ankle', 'annul', 'antic', 'anvil', 'aorta', 'aport',
  'arced', 'areas', 'arena', 'argot', 'ariel', 'arles', 'aroid', 'atilt',
  'atlas', 'atoll', 'atrip', 'attar', 'avast', 'avens', 'avers', 'avert',
  'avian', 'avoid', 'avow', 'awash', 'awful', 'awing', 'awned', 'awning',
  'azide', 'azure', 'babel', 'backs', 'bairn', 'baize', 'balmy', 'banjo',
  'baron', 'brawl', 'babes', 'eelam', 'flops', 'lolly', 'timid', 'seedy',
  'nacre', 'crave', 'craan', 'llama', 'roate', 'slate', 'adieu',
];

const BUNDLED_VALID_5 = new Set<string>([...ANSWER_WORDS, ...EXTRA_VALID_5]);

// ---------------------------------------------------------------------------
// Online validation — in-memory cache (lives for process lifetime).
// Uses the Free Dictionary API: no key required.
// ---------------------------------------------------------------------------
const onlineCache = new Map<string, boolean>();

async function checkOnline(word: string): Promise<boolean> {
  const cached = onlineCache.get(word);
  if (cached !== undefined) return cached;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`,
      { signal: controller.signal },
    );
    clearTimeout(timeoutId);
    const valid = res.ok;
    onlineCache.set(word, valid);
    return valid;
  } catch {
    // Network error / timeout — treat as invalid (don't cache so a retry can work)
    return false;
  }
}

// ---------------------------------------------------------------------------
// System dictionary loader
// ---------------------------------------------------------------------------

/**
 * Read /usr/share/dict/words (macOS / Linux) and bucket by word length.
 * Words with non-alpha chars are skipped. Call once at startup.
 */
export function loadSystemWords(
  lengths: number[] = [4, 5, 6, 7, 8, 9, 10],
): Map<number, Set<string>> {
  const byLength = new Map<number, Set<string>>();
  for (const len of lengths) byLength.set(len, new Set());

  try {
    const content = readFileSync('/usr/share/dict/words', 'utf-8');
    for (const line of content.split('\n')) {
      const word = line.toLowerCase().trim();
      if (!word || !/^[a-z]+$/.test(word)) continue;
      const set = byLength.get(word.length);
      if (set) set.add(word);
    }
  } catch {
    // Not available on this platform — silently continue with empty sets.
  }
  return byLength;
}

// ---------------------------------------------------------------------------
// Build WordList
// ---------------------------------------------------------------------------

export function buildWordList(
  opts: { systemWords?: Map<number, Set<string>> } = {},
): WordList {
  const systemWords = opts.systemWords ?? new Map<number, Set<string>>();

  return {
    randomAnswer({ wordLength, difficulty }) {
      // Allow env-var override for deterministic tests / e2e.
      const forced = process.env['WORDLE_FORCE_ANSWER'];
      if (forced) return forced.toLowerCase().trim();

      // For 5-letter normal games, use the curated bundled list.
      if (wordLength === 5 && difficulty === 'normal') {
        return ANSWER_WORDS[Math.floor(Math.random() * ANSWER_WORDS.length)]!;
      }

      // Build a pool from available sources.
      const pool: string[] = [];

      if (wordLength === 5) {
        pool.push(...ANSWER_WORDS);
      }

      const sysSet = systemWords.get(wordLength);
      if (sysSet) {
        // Hard mode or non-5-letter: add system words.
        // For 5-letter normal, we already returned above; this branch only runs
        // when difficulty === 'hard' OR wordLength !== 5.
        for (const w of sysSet) pool.push(w);
      }

      if (pool.length === 0) {
        // No words for this length — fall back to a safe error the route can catch.
        throw new Error(`No answer words available for length ${wordLength}`);
      }

      return pool[Math.floor(Math.random() * pool.length)]!;
    },

    async isValidGuess(word, { enableOnline = false } = {}) {
      // Bundled (5-letter only): O(1) set lookup.
      if (word.length === 5 && BUNDLED_VALID_5.has(word)) return true;

      // System dictionary: covers all lengths 4–10.
      const sysSet = systemWords.get(word.length);
      if (sysSet?.has(word)) return true;

      // Online fallback: only if caller opts in.
      if (enableOnline) return checkOnline(word);

      return false;
    },
  };
}
