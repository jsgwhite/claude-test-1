/**
 * In-memory metrics registry.
 *
 * Tracks per-route request counts, error counts, and latency samples.
 * Samples are bounded to the last MAX_SAMPLES per route to avoid unbounded growth.
 * Percentiles are computed on-demand from the stored sample array (sorted).
 */

const MAX_SAMPLES = 500;

export interface RouteMetrics {
  count: number;
  errorCount: number;
  clientErrorCount: number;
  /** Latest samples in ms (bounded to MAX_SAMPLES). */
  latencySamples: number[];
}

export interface LatencySummary {
  min: number;
  avg: number;
  p50: number;
  p95: number;
  max: number;
}

export interface RouteSnapshot {
  count: number;
  errorCount: number;
  clientErrorCount: number;
  latencyMs: LatencySummary;
}

export interface MetricsSnapshot {
  routes: Record<string, RouteSnapshot>;
  totals: {
    count: number;
    errorCount: number;
    clientErrorCount: number;
  };
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(idx, sorted.length - 1))];
}

function summariseLatency(samples: number[]): LatencySummary {
  if (samples.length === 0) {
    return { min: 0, avg: 0, p50: 0, p95: 0, max: 0 };
  }
  const sorted = [...samples].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, v) => acc + v, 0);
  return {
    min: sorted[0],
    avg: Math.round((sum / sorted.length) * 100) / 100,
    p50: percentile(sorted, 50),
    p95: percentile(sorted, 95),
    max: sorted[sorted.length - 1],
  };
}

export class MetricsRegistry {
  private readonly routes = new Map<string, RouteMetrics>();

  private getOrCreate(route: string): RouteMetrics {
    let m = this.routes.get(route);
    if (!m) {
      m = { count: 0, errorCount: 0, clientErrorCount: 0, latencySamples: [] };
      this.routes.set(route, m);
    }
    return m;
  }

  record(route: string, statusCode: number, durationMs: number): void {
    const m = this.getOrCreate(route);
    m.count++;
    if (statusCode >= 500) {
      m.errorCount++;
    } else if (statusCode >= 400) {
      m.clientErrorCount++;
    }
    // Bounded sample ring: drop oldest when full.
    if (m.latencySamples.length >= MAX_SAMPLES) {
      m.latencySamples.shift();
    }
    m.latencySamples.push(durationMs);
  }

  snapshot(): MetricsSnapshot {
    const routes: Record<string, RouteSnapshot> = {};
    let totalCount = 0;
    let totalError = 0;
    let totalClientError = 0;

    for (const [route, m] of this.routes) {
      routes[route] = {
        count: m.count,
        errorCount: m.errorCount,
        clientErrorCount: m.clientErrorCount,
        latencyMs: summariseLatency(m.latencySamples),
      };
      totalCount += m.count;
      totalError += m.errorCount;
      totalClientError += m.clientErrorCount;
    }

    return {
      routes,
      totals: {
        count: totalCount,
        errorCount: totalError,
        clientErrorCount: totalClientError,
      },
    };
  }
}
