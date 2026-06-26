/**
 * Playwright e2e configuration.
 *
 * Determinism: the API server is launched with WORDLE_FORCE_ANSWER=crane so
 * the smoke test can type a guaranteed win without knowing a random answer.
 *
 * webServer block starts BOTH the API (port 3001) and the Vite dev server
 * (port 5173). CI should ensure Node 22 and npm deps are already installed.
 *
 * If you prefer to bring your own servers (e.g. in a Docker environment),
 * comment out the webServer block and start:
 *   WORDLE_FORCE_ANSWER=crane npm run dev:api   # port 3001
 *   npm run dev:web                             # port 5173
 */
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',

  // Give each test generous time since dev servers cold-start.
  timeout: 30_000,
  expect: { timeout: 5_000 },

  // Fail fast in CI; allow retries locally.
  retries: process.env['CI'] ? 2 : 0,

  // Run one worker (serial) to keep server logs readable.
  workers: 1,

  reporter: 'list',

  use: {
    baseURL: 'http://localhost:5173',
    // Record a trace on first retry so failures are diagnosable.
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: [
    {
      // API server — force a known answer so the smoke test is deterministic.
      command: 'npm run dev --workspace=@wordle/api',
      url: 'http://localhost:3001/api/health',
      reuseExistingServer: !process.env['CI'],
      timeout: 30_000,
      cwd: '..',
      env: {
        WORDLE_FORCE_ANSWER: 'crane',
        PORT: '3001',
      },
    },
    {
      // Vite web dev server.
      command: 'npm run dev --workspace=@wordle/web',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env['CI'],
      timeout: 30_000,
      cwd: '..',
    },
  ],
});
