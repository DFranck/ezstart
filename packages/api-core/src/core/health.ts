/**
 * Deep health check primitives.
 *
 * `/health` (already mounted by {@link ./create-server.ts}) is a shallow
 * liveness probe — returns `{ status: 'ok' }` with no I/O so k8s and
 * Railway healthcheck never wait on a slow DB. `/health/deep` is the
 * readiness probe consumed by status pages and external uptime monitors:
 * it pings the DB connector (when present) and runs every caller-supplied
 * {@link HealthCheck} in parallel, surfacing the aggregate state.
 *
 * See `.claude/rules/standard-saas-observability.md` §4.
 */

import type { RequestHandler } from 'express'
import type { DbConnector } from './db-connector.js'

/**
 * Outcome of a single check.
 *
 * - `ok` — the dependency is healthy.
 * - `degraded` — the dependency is reachable but slow / partially failing
 *   (the deep probe still returns 200 in this case so non-critical
 *   alerts can be suppressed).
 * - `down` — the dependency is unreachable; the deep probe returns 503.
 */
export type HealthCheckStatus = 'ok' | 'degraded' | 'down'

/**
 * Structured result returned by a {@link HealthCheck.check} implementation.
 */
export type HealthCheckResult = {
  status: HealthCheckStatus
  /** Optional human-readable detail, surfaced in the deep response. */
  message?: string
  /** Optional structured payload (versions, latencies, ...). */
  details?: Record<string, unknown>
}

/**
 * A named check executed when `/health/deep` is hit.
 *
 * Each check runs with a default 5s timeout — a check that hangs longer
 * than its timeout is reported as `down` (status 503). Checks that throw
 * are also reported as `down` with the error message captured in the
 * `message` field of the response (production message is sanitized when
 * `NODE_ENV === 'production'`).
 */
export type HealthCheck = {
  /** Stable identifier surfaced in the response (`checks.<name>`). */
  name: string
  /** Per-check timeout in ms. Default 5000. */
  timeoutMs?: number
  /** Run the check. Return `{ status: 'down' }` or throw to fail. */
  check(): Promise<HealthCheckResult> | HealthCheckResult
}

/**
 * Snapshot returned by the `/health/deep` handler.
 */
export type DeepHealthSnapshot = {
  /** Aggregate status — `down` if any check failed, `degraded` otherwise. */
  status: HealthCheckStatus
  /** Wall-clock time the snapshot was produced. */
  timestamp: string
  /** Process uptime in seconds (`process.uptime()`). */
  uptime: number
  /** Service identifier (defaults to `serviceName`). */
  service: string
  /** Optional service version (consumer-provided). */
  version?: string
  /** Per-check results keyed by `HealthCheck.name`. */
  checks: Record<
    string,
    HealthCheckResult & {
      /** Time the check took to resolve, in milliseconds. */
      durationMs: number
    }
  >
}

const DEFAULT_TIMEOUT_MS = 5_000

/**
 * Race a promise against a timeout — resolves to `down` when the timeout
 * fires before the promise settles. Used internally by {@link runHealthCheck}
 * to make sure a hanging check never stalls the overall response.
 */
async function withTimeout<T>(
  promise: Promise<T> | T,
  timeoutMs: number,
  onTimeout: () => T
): Promise<T> {
  let timer: NodeJS.Timeout | undefined
  try {
    return await Promise.race<T>([
      Promise.resolve(promise),
      new Promise<T>(resolve => {
        timer = setTimeout(() => resolve(onTimeout()), timeoutMs)
      }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

/**
 * Build the generic production-safe fallback message for a `down` check.
 * Centralised so the throw branch + the factory-returned branch produce
 * the exact same shape (hacker-A8 V2: factory `down` results bypassed
 * the throw-branch sanitization in `runHealthCheck`).
 *
 * @internal
 */
function genericDownMessage(name: string): string {
  return `Check '${name}' failed`
}

/**
 * Sanitize a {@link HealthCheckResult} for public output. When `isProd`
 * is true, any `down` status has its `message` replaced with a generic
 * fallback so raw error strings from upstream drivers (Mongoose, Stripe
 * SDK, fetch) never reach the public `/health/deep` JSON snapshot
 * rendered on `<StatusPage>`.
 *
 * The `details` field is preserved as-is — the URL emitted by
 * `createHttpCheck` is already sanitized at source (see
 * {@link sanitizeUrlForPublicOutput} in `deep-health-checks.ts`).
 *
 * @internal
 */
function sanitizeResultForProd(
  result: HealthCheckResult,
  checkName: string,
  isProd: boolean
): HealthCheckResult {
  if (!isProd || result.status !== 'down') return result
  return { ...result, message: genericDownMessage(checkName) }
}

/**
 * Execute a single check, capturing duration + sanitizing every `down`
 * result so raw upstream error strings never leak through the public
 * `/health/deep` JSON in production. Both throw-branch errors AND
 * factory-returned `{ status: 'down', message: ... }` shapes are scrubbed
 * here — single source of truth for the prod sanitization contract.
 *
 * @internal
 */
export async function runHealthCheck(
  check: HealthCheck,
  isProd: boolean
): Promise<HealthCheckResult & { durationMs: number }> {
  const timeoutMs = check.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const start = Date.now()

  try {
    const result = await withTimeout<HealthCheckResult>(check.check(), timeoutMs, () => ({
      status: 'down',
      message: `Check '${check.name}' timed out after ${timeoutMs}ms`,
    }))
    const sanitized = sanitizeResultForProd(result, check.name, isProd)
    return { ...sanitized, durationMs: Date.now() - start }
  } catch (err) {
    const message =
      isProd || !(err instanceof Error)
        ? genericDownMessage(check.name)
        : `${check.name}: ${err.message}`
    return { status: 'down', message, durationMs: Date.now() - start }
  }
}

/**
 * Build a `HealthCheck` that pings a {@link DbConnector}.
 *
 * Reports `down` when the connector is not connected, otherwise resolves
 * to `ok`. Connectors that expose a richer ping (e.g. mongoose `db.admin().ping()`)
 * should provide their own check via `deepHealthChecks` — this is the
 * generic contract-only fallback.
 */
export function createDbHealthCheck(connector: DbConnector): HealthCheck {
  return {
    name: 'db',
    async check(): Promise<HealthCheckResult> {
      if (!connector.isConnected) {
        return { status: 'down', message: 'Database not connected' }
      }
      return { status: 'ok' }
    },
  }
}

/**
 * Aggregate the worst status across a result map.
 *
 * - Any `down` → overall `down`.
 * - Otherwise any `degraded` → overall `degraded`.
 * - Otherwise `ok`.
 *
 * @internal
 */
export function aggregateStatus(
  results: Record<string, { status: HealthCheckStatus }>
): HealthCheckStatus {
  const values = Object.values(results)
  if (values.some(r => r.status === 'down')) return 'down'
  if (values.some(r => r.status === 'degraded')) return 'degraded'
  return 'ok'
}

/**
 * Configuration for {@link createDeepHealthHandler}.
 */
export type DeepHealthHandlerConfig = {
  serviceName: string
  /** Custom checks (registered IN ADDITION to the auto-derived DB check). */
  checks?: HealthCheck[]
  /** DB connector — when present, an automatic `db` check is appended. */
  db?: DbConnector
  /** Optional service version surfaced in the response. */
  version?: string
  /** Sanitize error messages for production. Default: `NODE_ENV === 'production'`. */
  isProd?: boolean
  /**
   * In-memory response cache TTL in milliseconds. When > 0 the most recent
   * snapshot is replayed for subsequent calls within the window, collapsing a
   * burst of `/health/deep` pings into a single backing check.
   *
   * Status-page pollers (Better Stack, Pingdom, UptimeRobot) typically ping
   * every 30-60s so a 1s cache is invisible to them while neutralising the
   * DoS vector documented in the Wave B Lot 4 hacker report (M5): 100
   * concurrent pings previously opened 100 Mongoose pool slots, starving
   * real requests.
   *
   * Default `0` (caching disabled) — opt-in by the consumer via
   * `createBaseApiServer` (which sets `cacheMs: 1_000` by default).
   */
  cacheMs?: number
}

/**
 * Build the Express handler mounted at `/health/deep`.
 *
 * Returns 200 with `status: 'ok' | 'degraded'` when every critical check
 * resolves, 503 when at least one check is `down`. Handler never throws —
 * any internal failure is captured and reported in the response so the
 * status page polling endpoint stays consumable even when the API itself
 * is partially broken.
 *
 * @example
 * ```ts
 * import { createDeepHealthHandler } from '@ezstart/api-core'
 *
 * app.get('/health/deep', createDeepHealthHandler({
 *   serviceName: 'myapp',
 *   db: dbConnector,
 *   checks: [stripeCheck, redisCheck],
 * }))
 * ```
 */
export function createDeepHealthHandler(config: DeepHealthHandlerConfig): RequestHandler {
  const isProd = config.isProd ?? process.env.NODE_ENV === 'production'
  const cacheMs = Math.max(0, config.cacheMs ?? 0)

  // Wave B Lot 4 (M5): per-handler cache. Closure-scoped so each mount of
  // the factory has its own snapshot — multiple deep-health routes (e.g.
  // `/health/deep` + `/healthz/ready`) don't share state and can't cross-
  // pollute readiness signals. `inFlight` deduplicates concurrent first
  // requests so 100 parallel pings only trigger one backing run.
  let cached: { snapshot: DeepHealthSnapshot; expires: number } | null = null
  let inFlight: Promise<DeepHealthSnapshot> | null = null

  async function buildSnapshot(): Promise<DeepHealthSnapshot> {
    const checks: HealthCheck[] = []
    if (config.db) checks.push(createDbHealthCheck(config.db))
    if (config.checks) checks.push(...config.checks)

    const entries = await Promise.all(
      checks.map(async check => [check.name, await runHealthCheck(check, isProd)] as const)
    )
    const checksMap = Object.fromEntries(entries) as DeepHealthSnapshot['checks']

    const overall = aggregateStatus(checksMap)
    const snapshot: DeepHealthSnapshot = {
      status: overall,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      service: config.serviceName,
      checks: checksMap,
    }
    if (config.version !== undefined) snapshot.version = config.version
    return snapshot
  }

  return async function deepHealthHandler(_req, res): Promise<void> {
    const now = Date.now()

    if (cacheMs > 0 && cached !== null && cached.expires > now) {
      const cachedSnapshot = cached.snapshot
      res.status(cachedSnapshot.status === 'down' ? 503 : 200).json(cachedSnapshot)
      return
    }

    let snapshot: DeepHealthSnapshot
    if (cacheMs > 0) {
      // Coalesce concurrent first calls onto a single backing run — without
      // this, a burst of N pings during a cold cache would still fan out to
      // N parallel checks, defeating the cache's DoS-protection purpose.
      const pending = inFlight ?? buildSnapshot()
      inFlight = pending
      try {
        snapshot = await pending
      } finally {
        if (inFlight === pending) inFlight = null
      }
      cached = { snapshot, expires: Date.now() + cacheMs }
    } else {
      snapshot = await buildSnapshot()
    }

    res.status(snapshot.status === 'down' ? 503 : 200).json(snapshot)
  }
}
