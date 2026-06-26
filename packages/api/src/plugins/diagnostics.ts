/**
 * diagnosticsPlugin — observability layer for the Wordle API.
 *
 * Responsibilities:
 *  1. Structured request/response logging with correlation id.
 *  2. Per-route in-memory metrics (count, error counts, latency percentiles).
 *  3. Global error handler that emits the shared `{ error: { code, message } }` envelope.
 *  4. GET /api/health  — liveness + db ping.
 *  5. GET /api/metrics — JSON snapshot of the metrics registry.
 *
 * Encapsulation note: this plugin is wrapped with `fastify-plugin` so its hooks
 * and setErrorHandler are installed on the ROOT Fastify instance.  Without fp()
 * they would be scoped to the plugin's own sub-context and would NOT apply to the
 * sibling routesPlugin.
 */
import fp from 'fastify-plugin';
import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { ROUTES } from '@wordle/shared';
import type { ServerDeps } from '../server.js';
import { AppError } from '../errors.js';
import { MetricsRegistry } from './metrics.js';

export interface DiagnosticsOptions {
  deps: ServerDeps;
}

// Augment FastifyRequest so we can stash a start timestamp.
declare module 'fastify' {
  interface FastifyRequest {
    startTime?: bigint;
  }
}

const diagnosticsPluginImpl: FastifyPluginAsync<DiagnosticsOptions> = async (app, opts) => {
  const registry = new MetricsRegistry();

  // ------------------------------------------------------------------
  // 1. Timing stamp — recorded as early as possible.
  // ------------------------------------------------------------------
  app.addHook('onRequest', async (req: FastifyRequest) => {
    req.startTime = process.hrtime.bigint();
  });

  // ------------------------------------------------------------------
  // 2. Structured response log + metrics recording.
  // ------------------------------------------------------------------
  app.addHook('onResponse', async (req: FastifyRequest, reply: FastifyReply) => {
    const durationMs =
      req.startTime !== undefined
        ? Number(process.hrtime.bigint() - req.startTime) / 1_000_000
        : 0;

    const route: string =
      (req.routeOptions as { url?: string } | undefined)?.url ?? req.url;

    const statusCode = reply.statusCode;

    // Structured log entry with correlation id.
    req.log.info({
      event: 'request',
      reqId: req.id,
      method: req.method,
      url: req.url,
      statusCode,
      ms: Math.round(durationMs * 100) / 100,
    });

    registry.record(route, statusCode, Math.round(durationMs * 100) / 100);
  });

  // ------------------------------------------------------------------
  // 3. Global error handler.
  // ------------------------------------------------------------------
  app.setErrorHandler(async (err, req: FastifyRequest, reply: FastifyReply) => {
    // NOTE: error classification (4xx/5xx counts) happens in the onResponse
    // hook via registry.record(), which always fires with the final status code
    // — including for these error responses. We must NOT also count here, or
    // every error would be tallied twice.
    if (err instanceof AppError) {
      return reply.status(err.statusCode).send({
        error: { code: err.code, message: err.message },
      });
    }

    // Fastify schema validation errors carry a `validation` array.
    const anyErr = err as Record<string, unknown>;
    if ('validation' in anyErr && Array.isArray(anyErr['validation'])) {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: 'Request validation failed' },
      });
    }

    // Unknown / unexpected error — log everything, leak nothing.
    req.log.error({
      event: 'unhandled_error',
      reqId: req.id,
      err: String(anyErr['message'] ?? ''),
      stack: String(anyErr['stack'] ?? ''),
    });
    return reply.status(500).send({
      error: { code: 'INTERNAL_ERROR', message: 'An internal server error occurred' },
    });
  });

  // ------------------------------------------------------------------
  // 4. GET /api/health
  // ------------------------------------------------------------------
  app.get(ROUTES.health, async (_req, reply) => {
    let dbStatus: 'ok' | 'down' = 'ok';
    try {
      await opts.deps.gameRepo.ping();
    } catch {
      dbStatus = 'down';
    }

    const overallStatus = dbStatus === 'ok' ? 'ok' : 'degraded';
    return reply.status(200).send({
      status: overallStatus,
      uptimeSec: Math.round(process.uptime()),
      db: dbStatus,
    });
  });

  // ------------------------------------------------------------------
  // 5. GET /api/metrics
  // ------------------------------------------------------------------
  app.get(ROUTES.metrics, async (_req, reply) => {
    return reply.status(200).send(registry.snapshot());
  });
};

/**
 * Wrapping with fp() removes encapsulation so that the hooks and error handler
 * installed above are applied to the ROOT Fastify instance, making them visible
 * to all sibling plugins (including routesPlugin).
 */
export const diagnosticsPlugin = fp(diagnosticsPluginImpl, { name: 'diagnostics' });
