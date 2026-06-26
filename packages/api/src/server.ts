/**
 * buildServer — dependency-injection factory for the Fastify app.
 *
 * All collaborators (repositories, word list) are injected, which gives us:
 *  - swappable storage (pass any GameRepository/StatsRepository implementation),
 *  - fast deterministic tests (inject in-memory repos; no real DB or socket),
 *  - a single wiring point in src/index.ts for production.
 *
 * Plugins receive `deps` through their registration options.
 */
import Fastify, { type FastifyInstance, type FastifyServerOptions } from 'fastify';
import type { GameRepository } from './repositories/GameRepository.js';
import type { StatsRepository } from './repositories/StatsRepository.js';
import type { WordList } from './domain/wordlist.js';
import { diagnosticsPlugin } from './plugins/diagnostics.js';
import { routesPlugin } from './routes/index.js';

export interface ServerDeps {
  gameRepo: GameRepository;
  statsRepo: StatsRepository;
  wordList: WordList;
}

export interface BuildServerOptions {
  deps: ServerDeps;
  /** Fastify logger config; pass false in tests for quiet output. */
  logger?: FastifyServerOptions['logger'];
}

export async function buildServer(opts: BuildServerOptions): Promise<FastifyInstance> {
  const app = Fastify({
    logger: opts.logger ?? true,
    // Generate/propagate a request id for correlation in logs (diagnostics).
    genReqId: () => crypto.randomUUID(),
  });

  // Diagnostics first: it installs logging/timing hooks and the error handler,
  // and owns the /health and /metrics endpoints.
  await app.register(diagnosticsPlugin, { deps: opts.deps });

  // Game + stats routes.
  await app.register(routesPlugin, { deps: opts.deps });

  return app;
}
