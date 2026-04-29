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
 * Execute a single check, capturing duration + sanitizing thrown errors.
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
    return { ...result, durationMs: Date.now() - start }
  } catch (err) {
    const message =
      isProd || !(err instanceof Error)
        ? `Check '${check.name}' failed`
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

  return async function deepHealthHandler(_req, res): Promise<void> {
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

    res.status(overall === 'down' ? 503 : 200).json(snapshot)
  }
}
