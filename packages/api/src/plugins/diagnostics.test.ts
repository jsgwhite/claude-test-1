/**
 * Unit tests for diagnosticsPlugin.
 *
 * Uses Fastify's `.inject()` to drive the HTTP layer without a real network.
 * All dependencies are faked inline; the real routes plugin is NOT registered.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import Fastify from 'fastify';
import { diagnosticsPlugin } from './diagnostics.js';
import { AppError } from '../errors.js';
import { ROUTES } from '@wordle/shared';

// ---------------------------------------------------------------------------
// Fake deps
// ---------------------------------------------------------------------------
const fakeDeps = {
  gameRepo: {
    ping: async () => { /* resolves — db is "ok" */ },
    create: async () => { throw new Error('not needed in test'); },
    findById: async () => null,
    appendGuess: async () => { /* no-op */ },
    updateStatus: async () => { /* no-op */ },
  },
  statsRepo: {
    getByPlayerId: async () => null,
    upsert: async () => { /* no-op */ },
  },
  wordList: { includes: () => true, random: () => 'crane' },
};

// ---------------------------------------------------------------------------
// App fixture
// ---------------------------------------------------------------------------
async function buildTestApp() {
  const app = Fastify({ logger: false });

  await app.register(diagnosticsPlugin, { deps: fakeDeps as never });

  // Throwaway routes to exercise the error handler.
  app.get('/test/app-error', async () => {
    throw new AppError('GAME_NOT_FOUND', 'Game not found');
  });

  app.get('/test/generic-error', async () => {
    throw new Error('Something went boom');
  });

  await app.ready();
  return app;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('diagnosticsPlugin', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  it('AppError route returns correct status and error envelope', async () => {
    const res = await app.inject({ method: 'GET', url: '/test/app-error' });
    expect(res.statusCode).toBe(404);
    const body = res.json<{ error: { code: string; message: string } }>();
    expect(body.error.code).toBe('GAME_NOT_FOUND');
    expect(typeof body.error.message).toBe('string');
  });

  it('Generic Error route returns 500 INTERNAL_ERROR envelope', async () => {
    const res = await app.inject({ method: 'GET', url: '/test/generic-error' });
    expect(res.statusCode).toBe(500);
    const body = res.json<{ error: { code: string } }>();
    expect(body.error.code).toBe('INTERNAL_ERROR');
  });

  it('/api/health returns status ok when ping resolves', async () => {
    const res = await app.inject({ method: 'GET', url: ROUTES.health });
    expect(res.statusCode).toBe(200);
    const body = res.json<{ status: string; db: string; uptimeSec: number }>();
    expect(body.status).toBe('ok');
    expect(body.db).toBe('ok');
    expect(typeof body.uptimeSec).toBe('number');
  });

  it('/api/health returns degraded when ping rejects', async () => {
    const brokenDeps = {
      ...fakeDeps,
      gameRepo: {
        ...fakeDeps.gameRepo,
        ping: async () => { throw new Error('db is down'); },
      },
    };
    const brokenApp = Fastify({ logger: false });
    await brokenApp.register(diagnosticsPlugin, { deps: brokenDeps as never });
    await brokenApp.ready();

    const res = await brokenApp.inject({ method: 'GET', url: ROUTES.health });
    expect(res.statusCode).toBe(200);
    const body = res.json<{ status: string; db: string }>();
    expect(body.status).toBe('degraded');
    expect(body.db).toBe('down');

    await brokenApp.close();
  });

  it('/api/metrics shows counts > 0 after prior requests', async () => {
    // The earlier test cases already fired requests; metrics must reflect them.
    const res = await app.inject({ method: 'GET', url: ROUTES.metrics });
    expect(res.statusCode).toBe(200);
    const snap = res.json<{
      routes: Record<string, { count: number; errorCount: number; clientErrorCount: number; latencyMs: { min: number; avg: number; p50: number; p95: number; max: number } }>;
      totals: { count: number; errorCount: number; clientErrorCount: number };
    }>();

    // totals.count must be > 0 (the AppError + generic-error + health requests happened before).
    expect(snap.totals.count).toBeGreaterThan(0);
    // There should be at least one route entry.
    expect(Object.keys(snap.routes).length).toBeGreaterThan(0);

    // Verify the shape of any one entry.
    const firstRoute = Object.values(snap.routes)[0];
    expect(firstRoute).toHaveProperty('count');
    expect(firstRoute).toHaveProperty('errorCount');
    expect(firstRoute).toHaveProperty('clientErrorCount');
    expect(firstRoute.latencyMs).toHaveProperty('min');
    expect(firstRoute.latencyMs).toHaveProperty('avg');
    expect(firstRoute.latencyMs).toHaveProperty('p50');
    expect(firstRoute.latencyMs).toHaveProperty('p95');
    expect(firstRoute.latencyMs).toHaveProperty('max');
  });
});
