/**
 * Smoke test — verifies the core Wordle user journey end-to-end.
 *
 * Preconditions (handled by playwright.config.ts webServer):
 *   - API server running on :3001 with WORDLE_FORCE_ANSWER=crane
 *   - Vite dev server running on :5173
 *
 * The forced answer lets us type a guaranteed winning word without
 * the test knowing a random answer at runtime.
 *
 * Selectors are aligned to the actual web UI:
 *   - board container:        [data-testid="board"]
 *   - scored tiles:           [data-state="correct|present|absent"]
 *   - win banner (modal):     text "You got it!"
 *   - invalid-word toast:     text "Not in word list"
 */
import { test, expect, type Page } from '@playwright/test';

const FORCED_ANSWER = 'crane'; // matches WORDLE_FORCE_ANSWER in playwright.config.ts
const WRONG_WORD = 'slate'; // a valid dictionary word that is not the answer
const INVALID_WORD = 'xzxzx'; // well-formed but not in the dictionary

/** Type a word + Enter using the physical keyboard (useGame listens on window keydown). */
async function typeWord(page: Page, word: string): Promise<void> {
  for (const ch of word) {
    await page.keyboard.press(ch.toUpperCase());
  }
  await page.keyboard.press('Enter');
}

/** A scored tile is any tile whose data-state is a feedback value. */
const SCORED_TILES = '[data-state="correct"], [data-state="present"], [data-state="absent"]';

test('smoke — user can win by typing the correct answer', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('[data-testid="board"]', { timeout: 10_000 });

  await typeWord(page, FORCED_ANSWER);

  // Winning opens the stats modal with the "You got it!" banner.
  await expect(page.getByText(/you got it/i)).toBeVisible({ timeout: 8_000 });

  // Five tiles, all 'correct'.
  await expect(page.locator('[data-state="correct"]')).toHaveCount(5);
});

test('smoke — typing an invalid word shows an error and does not consume a row', async ({
  page,
}) => {
  await page.goto('/');
  await page.waitForSelector('[data-testid="board"]', { timeout: 10_000 });

  // One valid guess → exactly one scored row (5 scored tiles).
  await typeWord(page, WRONG_WORD);
  await expect(page.locator(SCORED_TILES)).toHaveCount(5, { timeout: 5_000 });

  // A non-dictionary word → transient error toast, no new row.
  await typeWord(page, INVALID_WORD);
  await expect(page.getByText(/not in word list/i)).toBeVisible({ timeout: 5_000 });

  // Still only one scored row — the invalid guess did not consume a row.
  await expect(page.locator(SCORED_TILES)).toHaveCount(5);
});
