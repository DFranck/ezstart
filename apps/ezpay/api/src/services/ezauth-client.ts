/**
 * EZAuth S2S client — thin fetch wrapper used at API-key creation time to
 * validate that a caller-supplied `applicationId` exists in the ezauth
 * source-of-truth, and that the caller is allowed to create keys against it.
 *
 * Design:
 * - Hot path requests NEVER hit ezauth — the middleware validates against
 *   the local ezpay DB (keys are validated once at creation and cached as
 *   rows in `api_keys`).
 * - This client is used ONLY at `POST /api/keys` and by future
 *   Phase G seed bootstrap.
 * - Timeout: 5s per request (AbortSignal).
 * - Retry: one retry on 5xx / transient fetch errors.
 * - Circuit breaker: after 3 consecutive failures, skip further calls for
 *   30s and return `null` immediately (fail-closed for ownership checks).
 *
 * @module apps/ezpay/api/src/services/ezauth-client
 */

import { getApiUrl } from '@ezstart/config'
import { logger } from '@ezstart/logger/server'

/** Minimal Application shape returned by `GET /applications/:id`. */
export interface EzauthApplication {
  id: string
  slug: string
  name: string
  description?: string | null
  ownerId: string
  metadata?: Record<string, unknown> | null
  status: 'active' | 'archived'
  /**
   * Optional override for the URL where outbound webhooks are delivered.
   * `null` means the sender uses its service-specific default (canonical
   * ezauth subscriptions endpoint for `notifyEzauthSubscription`).
   */
  webhookEndpointUrl?: string | null
  /**
   * Per-Application HMAC `whsec_<hex>` secret. **Only populated** when the
   * caller opted-in via `getApplication(id, { includeWebhookSecret: true })`
   * AND the auth context (Bearer JWT or admin S2S API key) is allowed to
   * see the secret. All other calls have this `undefined` (Mongoose
   * select:false elision on the receiving end).
   */
  webhookSecret?: string
  createdAt: string
  updatedAt: string
}

/** Minimal Application identity shape returned by `GET /applications/lookup`. */
export interface EzauthApplicationLookup {
  id: string
  slug: string
  name: string
}

/** Shape returned by `GET /applications/resolve?key=...`. */
export interface EzauthResolvedKey {
  applicationId: string | null
  slug: string
  name: string | null
  type?: 'publishable' | 'secret'
  env?: 'live' | 'test'
  scope: 'admin' | 'user' | 'readonly' | 'test' | 'live'
}

export interface EzauthClientOptions {
  apiUrl?: string
  /** Millisecond timeout per request. Default 5000. */
  timeoutMs?: number
  /** Override the default service S2S secret (`process.env.EZPAY_SERVER_EZAUTH_KEY`). */
  serverKey?: string
  /** Forward a Bearer JWT from the caller. Used for owner-scoped endpoints. */
  bearerToken?: string
}

interface CircuitState {
  consecutiveFailures: number
  openedAt: number | null
}

const DEFAULT_TIMEOUT_MS = 5_000
const CIRCUIT_TRIP_THRESHOLD = 3
const CIRCUIT_OPEN_MS = 30_000

const circuit: CircuitState = {
  consecutiveFailures: 0,
  openedAt: null,
}

function isCircuitOpen(): boolean {
  if (circuit.openedAt === null) return false
  if (Date.now() - circuit.openedAt > CIRCUIT_OPEN_MS) {
    circuit.consecutiveFailures = 0
    circuit.openedAt = null
    return false
  }
  return true
}

function recordSuccess(): void {
  circuit.consecutiveFailures = 0
  circuit.openedAt = null
}

function recordFailure(): void {
  circuit.consecutiveFailures += 1
  if (circuit.consecutiveFailures >= CIRCUIT_TRIP_THRESHOLD) {
    circuit.openedAt = Date.now()
    logger.warn('ezauth-client circuit opened after consecutive failures', {
      failures: circuit.consecutiveFailures,
    })
  }
}

interface EnvelopeSuccess<T> {
  success: true
  data: T
}

interface EnvelopeError {
  success: false
  error: string
}

type Envelope<T> = EnvelopeSuccess<T> | EnvelopeError

/**
 * Perform an authenticated fetch to ezauth with timeout + single retry on 5xx.
 * Returns the decoded envelope payload on 2xx, `null` on 404 / auth failures,
 * and throws on parse errors (caller should catch and fail-closed).
 */
async function fetchEzauth<T>(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<T | null> {
  const attempt = async (retry: boolean): Promise<T | null> => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const response = await fetch(url, { ...init, signal: controller.signal })
      clearTimeout(timer)

      if (response.status === 404) return null
      if (response.status === 401 || response.status === 403) return null

      if (response.status >= 500 && retry) {
        return attempt(false)
      }

      if (!response.ok) {
        logger.warn('ezauth-client non-ok response', {
          url,
          status: response.status,
        })
        return null
      }

      const body = (await response.json()) as Envelope<T>
      if (!body.success) return null
      return body.data
    } catch (err) {
      clearTimeout(timer)
      if (retry) {
        return attempt(false)
      }
      throw err
    }
  }

  return attempt(true)
}

function buildHeaders(opts: EzauthClientOptions): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  }
  if (opts.bearerToken) {
    headers.Authorization = `Bearer ${opts.bearerToken}`
  }
  const serverKey = opts.serverKey ?? process.env.EZPAY_SERVER_EZAUTH_KEY
  if (serverKey) {
    headers['X-API-Key'] = serverKey
  }
  return headers
}

/** Options for {@link getApplication} beyond the shared `EzauthClientOptions`. */
export interface GetApplicationOptions extends EzauthClientOptions {
  /**
   * When `true`, append `?include=webhookSecret` to the request so the
   * response includes the per-Application HMAC secret. Requires an auth
   * context (Bearer JWT or `EZPAY_SERVER_EZAUTH_KEY` superadmin key)
   * allowed to read the credential — strangers receive 404 and we return
   * `null` like any other miss.
   */
  includeWebhookSecret?: boolean
}

/**
 * GET `/api/applications/:id` — owner-scoped. Requires a Bearer JWT OR a
 * superadmin S2S API key in `EZPAY_SERVER_EZAUTH_KEY`. Returns `null` on
 * 404 / 401 / 403 so callers can fail-closed (treat as "not found or not
 * allowed").
 *
 * @example
 * const app = await getApplication('507f1f77bcf86cd799439011', { bearerToken })
 * if (!app) throw new Error('Application not found')
 *
 * @example
 * // Load the webhook secret along with the rest of the document so the
 * // S2S sender can sign outbound webhooks with the per-Application HMAC.
 * const app = await getApplication(id, { includeWebhookSecret: true })
 * const sig = createHmac('sha256', app!.webhookSecret!).update(body).digest('hex')
 */
export async function getApplication(
  id: string,
  opts: GetApplicationOptions = {}
): Promise<EzauthApplication | null> {
  if (isCircuitOpen()) {
    logger.warn('ezauth-client skipping call — circuit open', { op: 'getApplication' })
    return null
  }

  const apiUrl = opts.apiUrl ?? getApiUrl('ezauth')
  const search = opts.includeWebhookSecret ? '?include=webhookSecret' : ''
  const url = `${apiUrl}/api/applications/${encodeURIComponent(id)}${search}`
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS

  try {
    const data = await fetchEzauth<EzauthApplication>(
      url,
      { method: 'GET', headers: buildHeaders(opts) },
      timeoutMs
    )
    recordSuccess()
    return data
  } catch (err) {
    recordFailure()
    logger.error('ezauth-client getApplication failed', { id, error: err })
    return null
  }
}

/**
 * GET `/api/applications` — owner-scoped list. Requires a Bearer JWT for the
 * calling user. Returns the array of Applications that the user owns, or an
 * empty array on 404/401/403/circuit-open. Used to resolve the set of app
 * slugs a user is the owner of for `scope=myApps` on payments/subscriptions.
 *
 * @example
 * const apps = await listApplicationsByOwner({ bearerToken })
 * const slugs = apps.map(a => a.slug)
 */
export async function listApplicationsByOwner(
  opts: EzauthClientOptions = {}
): Promise<EzauthApplication[]> {
  if (isCircuitOpen()) {
    logger.warn('ezauth-client skipping call — circuit open', { op: 'listApplicationsByOwner' })
    return []
  }

  const apiUrl = opts.apiUrl ?? getApiUrl('ezauth')
  const url = `${apiUrl}/api/applications`
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS

  try {
    const data = await fetchEzauth<EzauthApplication[]>(
      url,
      { method: 'GET', headers: buildHeaders(opts) },
      timeoutMs
    )
    recordSuccess()
    return data ?? []
  } catch (err) {
    recordFailure()
    logger.error('ezauth-client listApplicationsByOwner failed', { error: err })
    return []
  }
}

/**
 * GET `/api/applications/lookup?slug=...` — public (rate-limited). Returns
 * the minimal `{id, slug, name}` tuple if the slug maps to an active
 * Application, or `null` otherwise.
 */
export async function lookupApplicationBySlug(
  slug: string,
  opts: EzauthClientOptions = {}
): Promise<EzauthApplicationLookup | null> {
  if (isCircuitOpen()) {
    logger.warn('ezauth-client skipping call — circuit open', { op: 'lookupApplicationBySlug' })
    return null
  }

  const apiUrl = opts.apiUrl ?? getApiUrl('ezauth')
  const url = `${apiUrl}/api/applications/lookup?slug=${encodeURIComponent(slug)}`
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS

  try {
    const data = await fetchEzauth<EzauthApplicationLookup>(
      url,
      { method: 'GET', headers: buildHeaders(opts) },
      timeoutMs
    )
    recordSuccess()
    return data
  } catch (err) {
    recordFailure()
    logger.error('ezauth-client lookupApplicationBySlug failed', { slug, error: err })
    return null
  }
}

/**
 * GET `/api/applications/resolve?key=...` — public (rate-limited). Given a
 * raw ezauth API key, returns the Application identity it's scoped to
 * alongside the `type`/`env`/`scope` tuple.
 */
export async function resolveKey(
  key: string,
  opts: EzauthClientOptions = {}
): Promise<EzauthResolvedKey | null> {
  if (isCircuitOpen()) {
    logger.warn('ezauth-client skipping call — circuit open', { op: 'resolveKey' })
    return null
  }

  const apiUrl = opts.apiUrl ?? getApiUrl('ezauth')
  const url = `${apiUrl}/api/applications/resolve?key=${encodeURIComponent(key)}`
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS

  try {
    const data = await fetchEzauth<EzauthResolvedKey>(
      url,
      { method: 'GET', headers: buildHeaders(opts) },
      timeoutMs
    )
    recordSuccess()
    return data
  } catch (err) {
    recordFailure()
    logger.error('ezauth-client resolveKey failed', { error: err })
    return null
  }
}

/**
 * @internal Exposed for tests only — reset the circuit breaker state between
 * test cases so they don't bleed side effects.
 */
export function _resetCircuitForTests(): void {
  circuit.consecutiveFailures = 0
  circuit.openedAt = null
}
