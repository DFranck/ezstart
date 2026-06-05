/**
 * Shared types for {@link StatusPage} and its helpers. Extracted to keep
 * `status-page.tsx` under the 400-line limit (cf.
 * `.claude/rules/standard.md` §3) without leaking the internals through a
 * circular import.
 */

export type StatusServiceState = 'operational' | 'degraded' | 'down' | 'checking'

/**
 * Probe depth of a {@link StatusService}.
 *
 * - `shallow` (default) — fetches the URL and treats any 2xx/3xx as
 *   healthy. Cheap and provider-agnostic, but tells you nothing about the
 *   service's downstream dependencies (DB, Stripe, ...).
 * - `deep` — fetches `deepUrl` (typically `/health/deep`) and parses the
 *   JSON snapshot produced by `createDeepHealthHandler` from
 *   `@ezstart/api-core`. Per-dependency results are surfaced as a
 *   `DependencyList` under the service line.
 */
export type StatusServiceMode = 'shallow' | 'deep'

/**
 * Single dependency check result surfaced by a `/health/deep` snapshot.
 * Mirrors the shape returned by `@ezstart/api-core` —
 * `DeepHealthSnapshot.checks[name]`.
 */
export interface StatusDependency {
  /** Stable dependency identifier (e.g. `'db'`, `'stripe'`). */
  name: string
  /** Outcome of the check. */
  status: 'ok' | 'degraded' | 'down'
  /** Optional human-readable detail surfaced by the deep handler. */
  message?: string
  /** Time the dependency check took, in milliseconds. */
  durationMs?: number
}

export interface StatusService {
  /** Display name (e.g. "EZAuth API"). */
  name: string
  /** Full URL to a `/health`-style endpoint that returns 2xx when healthy. */
  url: string
  /** Optional one-line description shown under the service name. */
  description?: string
  /**
   * Probe depth. Default `'shallow'`. Set to `'deep'` AND provide
   * {@link StatusService.deepUrl} to parse a deep health snapshot.
   */
  mode?: StatusServiceMode
  /**
   * URL of the deep-health endpoint (typically `${api}/health/deep`).
   * Required when `mode === 'deep'`. When omitted, the component falls
   * back to the shallow probe even if `mode` is set.
   */
  deepUrl?: string
}

export interface StatusServiceResult {
  service: StatusService
  state: StatusServiceState
  /** Round-trip time in milliseconds (null when network failure). */
  responseTimeMs: number | null
  /** HTTP status code returned by the endpoint, when reachable. */
  statusCode: number | null
  /** Last check timestamp. */
  checkedAt: Date | null
  /** Error message captured from the failed fetch (timeout, network, non-2xx). */
  error: string | null
  /**
   * Per-dependency results parsed from a `/health/deep` snapshot. Empty /
   * absent for shallow probes or when the deep endpoint failed.
   */
  dependencies?: StatusDependency[]
}
