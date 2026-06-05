/**
 * Pre-built {@link HealthCheck} factories for common SaaS dependencies.
 *
 * Each factory returns a `HealthCheck` ready to be wired into
 * `createApiServer({ deepHealthChecks: [...] })` (or `bootApi(...)` —
 * they propagate transparently). Checks issue a single lightweight read
 * (admin ping, HEAD, balance retrieve) and respect a per-check timeout.
 *
 * Status mapping:
 * - `ok` — responded within `slowThresholdMs`.
 * - `degraded` — responded but slower than `slowThresholdMs` (default
 *   2000ms). Deep endpoint still returns 200; aggregate flips to
 *   `degraded` so status pages flag the slowdown without paging.
 * - `down` — threw, timed out, or returned non-2xx. Deep endpoint
 *   returns 503 so external uptime monitors page an incident.
 *
 * See `.claude/rules/standard-saas-observability.md` §4.
 */

import type { HealthCheck, HealthCheckResult } from './health.js'

/**
 * Default response time above which a successful check is downgraded
 * from `ok` to `degraded`. Aligned with the value documented in
 * `.claude/rules/standard-saas-observability.md` §4 (the deep probe must
 * remain consumable by status pages polling every 30-60s, so the slow
 * threshold is intentionally generous).
 */
const DEFAULT_SLOW_THRESHOLD_MS = 2_000

/**
 * Per-check fetch timeout used by the HTTP-based factories. Slightly
 * tighter than the 5s default of the surrounding {@link HealthCheck}
 * runner so a misbehaving dependency surfaces as `down` (timeout) rather
 * than `degraded` (slow).
 */
const DEFAULT_HTTP_TIMEOUT_MS = 4_000

/**
 * Minimal contract for the mongoose instance consumed by
 * {@link createMongoosePingCheck}. Keeps the helper decoupled from a
 * direct `mongoose` import so this file stays usable in tests where
 * mongoose is mocked.
 *
 * @internal
 */
export type MongoosePingable = {
  connection: {
    readyState: number
    db?: {
      admin(): { ping(): Promise<unknown> }
    } | null
  }
}

/**
 * Common shape used by every {@link HealthCheck} factory in this module.
 */
export type DeepHealthCheckOptions = {
  /** Override the check name surfaced in the response. */
  name?: string
  /** Per-check timeout in milliseconds. */
  timeoutMs?: number
  /**
   * Response-time threshold (ms) above which the check is downgraded
   * to `degraded`. Default {@link DEFAULT_SLOW_THRESHOLD_MS}.
   */
  slowThresholdMs?: number
}

/**
 * Wrap an async op with a timeout. Resolves to `{ ok: false }` when the
 * timeout fires before the inner promise settles, so a hanging
 * dependency never stalls the deep-health response.
 *
 * @internal
 */
async function withTimeoutResult<T>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<{ ok: true; value: T } | { ok: false; reason: 'timeout' }> {
  let timer: NodeJS.Timeout | undefined
  try {
    const timeoutPromise = new Promise<{ ok: false; reason: 'timeout' }>(resolve => {
      timer = setTimeout(() => resolve({ ok: false, reason: 'timeout' }), timeoutMs)
    })
    const result = await Promise.race<{ ok: true; value: T } | { ok: false; reason: 'timeout' }>([
      promise.then(value => ({ ok: true, value })),
      timeoutPromise,
    ])
    return result
  } finally {
    if (timer) clearTimeout(timer)
  }
}

/** Derive `ok` vs `degraded` from an elapsed duration. @internal */
function classifyDuration(durationMs: number, slowThresholdMs: number): HealthCheckResult {
  if (durationMs > slowThresholdMs) {
    return {
      status: 'degraded',
      message: `Slow response (${durationMs}ms > ${slowThresholdMs}ms threshold)`,
      details: { durationMs, slowThresholdMs },
    }
  }
  return { status: 'ok', details: { durationMs } }
}

/**
 * Ping a Mongoose connection via `db.admin().ping()`.
 *
 * Reports `down` when the connection is not in `readyState === 1`
 * (connected) or when the admin ping rejects. The check is cheap (a
 * single round-trip to the primary) so it's safe to run on every
 * `/health/deep` poll.
 *
 * @example
 * ```ts
 * import mongoose from 'mongoose'
 * import { createMongoosePingCheck } from '@ezstart/api-core'
 *
 * await bootApi('myapp', {
 *   mongoDbName: 'myapp',
 *   deepHealthChecks: [createMongoosePingCheck(mongoose)],
 *   // ...
 * })
 * ```
 */
export function createMongoosePingCheck(
  mongoose: MongoosePingable,
  options: DeepHealthCheckOptions = {}
): HealthCheck {
  const name = options.name ?? 'mongodb'
  const timeoutMs = options.timeoutMs ?? DEFAULT_HTTP_TIMEOUT_MS
  const slowThresholdMs = options.slowThresholdMs ?? DEFAULT_SLOW_THRESHOLD_MS

  return {
    name,
    timeoutMs,
    async check(): Promise<HealthCheckResult> {
      const conn = mongoose.connection
      if (conn.readyState !== 1) {
        return {
          status: 'down',
          message: `Mongoose connection not ready (readyState=${conn.readyState})`,
        }
      }

      const db = conn.db
      if (!db) {
        return { status: 'down', message: 'Mongoose connection has no active db handle' }
      }

      const start = Date.now()
      try {
        const result = await withTimeoutResult(db.admin().ping(), timeoutMs)
        if (!result.ok) {
          return { status: 'down', message: `MongoDB ping timed out after ${timeoutMs}ms` }
        }
        return classifyDuration(Date.now() - start, slowThresholdMs)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'MongoDB ping failed'
        return { status: 'down', message }
      }
    },
  }
}

/**
 * Minimal Stripe client surface used by {@link createStripeBalanceCheck}.
 * Keeps the helper decoupled from the `stripe` package's published types
 * (which change shape across major versions).
 *
 * @internal
 */
export type StripeBalanceClient = {
  balance: { retrieve(): Promise<unknown> }
}

/**
 * Check Stripe API reachability via `balance.retrieve()`. The call is
 * idempotent and doesn't mutate any state — Stripe explicitly lists it
 * as a safe health probe.
 *
 * @example
 * ```ts
 * import Stripe from 'stripe'
 * import { createStripeBalanceCheck } from '@ezstart/api-core'
 *
 * const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
 * await bootApi('ezpay', {
 *   deepHealthChecks: [createStripeBalanceCheck(stripe)],
 *   // ...
 * })
 * ```
 */
export function createStripeBalanceCheck(
  stripe: StripeBalanceClient,
  options: DeepHealthCheckOptions = {}
): HealthCheck {
  const name = options.name ?? 'stripe'
  const timeoutMs = options.timeoutMs ?? DEFAULT_HTTP_TIMEOUT_MS
  const slowThresholdMs = options.slowThresholdMs ?? DEFAULT_SLOW_THRESHOLD_MS

  return {
    name,
    timeoutMs,
    async check(): Promise<HealthCheckResult> {
      const start = Date.now()
      try {
        const result = await withTimeoutResult(stripe.balance.retrieve(), timeoutMs)
        if (!result.ok) {
          return {
            status: 'down',
            message: `Stripe balance.retrieve timed out after ${timeoutMs}ms`,
          }
        }
        return classifyDuration(Date.now() - start, slowThresholdMs)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Stripe balance.retrieve failed'
        return { status: 'down', message }
      }
    },
  }
}

/**
 * Generic HTTP reachability check. Issues a `HEAD` (default) or `GET`
 * request and treats 2xx/3xx as `ok`, 4xx/5xx as `down`.
 *
 * Use the dedicated factories ({@link createResendCheck},
 * {@link createGeminiCheck}, ...) when available — they encode the
 * provider-specific health endpoint + auth headers.
 *
 * @example
 * ```ts
 * createHttpCheck({
 *   name: 'cms',
 *   url: 'https://cms.example.com/api/health',
 *   method: 'GET',
 * })
 * ```
 */
export function createHttpCheck(opts: {
  name: string
  url: string
  method?: 'HEAD' | 'GET'
  headers?: Record<string, string>
  timeoutMs?: number
  slowThresholdMs?: number
}): HealthCheck {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_HTTP_TIMEOUT_MS
  const slowThresholdMs = opts.slowThresholdMs ?? DEFAULT_SLOW_THRESHOLD_MS
  const method = opts.method ?? 'HEAD'

  return {
    name: opts.name,
    timeoutMs,
    async check(): Promise<HealthCheckResult> {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), timeoutMs)
      const start = Date.now()

      try {
        const response = await fetch(opts.url, {
          method,
          signal: controller.signal,
          headers: opts.headers,
          // Health probes never need cookies / credentials.
          credentials: 'omit',
        })
        const durationMs = Date.now() - start

        if (!response.ok && (response.status < 300 || response.status >= 400)) {
          return {
            status: 'down',
            message: `HTTP ${response.status} ${response.statusText}`,
            details: { url: opts.url, status: response.status, durationMs },
          }
        }
        return classifyDuration(durationMs, slowThresholdMs)
      } catch (err) {
        const isAbort = err instanceof Error && err.name === 'AbortError'
        const message = isAbort
          ? `HTTP check '${opts.name}' timed out after ${timeoutMs}ms`
          : err instanceof Error
            ? err.message
            : 'Network error'
        return { status: 'down', message }
      } finally {
        clearTimeout(timer)
      }
    },
  }
}

/**
 * Check Resend (transactional email) reachability via the public
 * `GET /domains` endpoint. Returns `down` when the API key is invalid
 * (401) or unreachable.
 *
 * @example
 * ```ts
 * deepHealthChecks: [createResendCheck(process.env.RESEND_API_KEY!)]
 * ```
 */
export function createResendCheck(
  apiKey: string,
  options: DeepHealthCheckOptions = {}
): HealthCheck {
  return createHttpCheck({
    name: options.name ?? 'resend',
    url: 'https://api.resend.com/domains',
    method: 'GET',
    headers: { Authorization: `Bearer ${apiKey}` },
    timeoutMs: options.timeoutMs,
    slowThresholdMs: options.slowThresholdMs,
  })
}

/**
 * Check Google Gemini API reachability via the public models list. The
 * endpoint accepts the API key as a query param so we don't have to
 * leak the secret in headers (and a 200 response confirms the key is
 * valid for at least one model).
 *
 * @example
 * ```ts
 * deepHealthChecks: [createGeminiCheck(process.env.GEMINI_API_KEY!)]
 * ```
 */
export function createGeminiCheck(
  apiKey: string,
  options: DeepHealthCheckOptions = {}
): HealthCheck {
  return createHttpCheck({
    name: options.name ?? 'gemini',
    // `encodeURIComponent` defends against an operator accidentally
    // appending raw query params to the API key in env.
    url: `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`,
    method: 'GET',
    timeoutMs: options.timeoutMs,
    slowThresholdMs: options.slowThresholdMs,
  })
}

/**
 * Check OpenAI API reachability via `GET /v1/models`. The endpoint
 * authenticates the Bearer token and returns the model catalogue when
 * valid — a 401 surfaces as `down` so an operator notices a rotated /
 * revoked key.
 *
 * @example
 * ```ts
 * deepHealthChecks: [createOpenAICheck(process.env.OPENAI_API_KEY!)]
 * ```
 */
export function createOpenAICheck(
  apiKey: string,
  options: DeepHealthCheckOptions = {}
): HealthCheck {
  return createHttpCheck({
    name: options.name ?? 'openai',
    url: 'https://api.openai.com/v1/models',
    method: 'GET',
    headers: { Authorization: `Bearer ${apiKey}` },
    timeoutMs: options.timeoutMs,
    slowThresholdMs: options.slowThresholdMs,
  })
}

/**
 * Check Anthropic API reachability via the public `/v1/models` catalogue
 * endpoint. Anthropic requires the `anthropic-version` header on every
 * call — we pin it to the stable date documented in the public docs.
 *
 * @example
 * ```ts
 * deepHealthChecks: [createAnthropicCheck(process.env.ANTHROPIC_API_KEY!)]
 * ```
 */
export function createAnthropicCheck(
  apiKey: string,
  options: DeepHealthCheckOptions = {}
): HealthCheck {
  return createHttpCheck({
    name: options.name ?? 'anthropic',
    url: 'https://api.anthropic.com/v1/models',
    method: 'GET',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    timeoutMs: options.timeoutMs,
    slowThresholdMs: options.slowThresholdMs,
  })
}
