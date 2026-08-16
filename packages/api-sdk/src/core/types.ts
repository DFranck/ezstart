/**
 * Core agnostic types for the API SDK.
 *
 * No coupling to `@ezstart/config`, `@ezstart/logger`, or any monorepo-
 * specific concept. Consumers configure the client via `createApiClient(config)`.
 *
 * Wire-level primitives (`ApiMeta`, `ErrorPayload`, `SuccessResponse`, ...) live
 * in `@ezstart/api-contracts` — the single source of truth shared with the
 * server. This module re-exports `ApiMeta` from there so SDK consumers still
 * see the same symbol.
 */

import type { ApiMeta as ContractsApiMeta } from '@ezstart/api-contracts'

/** HTTP methods supported by the SDK. */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

/**
 * Standard `meta` shape of paginated or envelope responses.
 *
 * Re-exported from `@ezstart/api-contracts` so client and server agree on the
 * exact wire shape.
 */
export type ApiMeta = ContractsApiMeta

/**
 * Raw shape of error payloads accepted by {@link parseApiError}.
 *
 * Intentionally permissive — supports legacy (`{ error: 'string' }`), nested
 * (`{ error: { message, code } }`), flat (`{ message, code }`) and Zod
 * validation (`{ details: [...] }`) formats. The strict on-the-wire shape is
 * `ErrorPayload` in `@ezstart/api-contracts`; this type is the PARSE-time
 * superset the client is prepared to normalize.
 */
export type ApiErrorPayload = {
  error?: unknown
  message?: string
  code?: string
  details?: unknown
  retryAfter?: number | string
  [key: string]: unknown
}

/** Query value types accepted for URL serialization. */
export type QueryValue = string | number | boolean | undefined | null
export type QueryParams = Record<string, QueryValue>

/**
 * Token store contract. Optional: omit for no-auth clients.
 */
export type TokenStore = {
  /** Read the current access token (null if not authenticated). */
  getAccessToken: () => string | null | Promise<string | null>
  /** Optional: required for auto-refresh on 401. */
  getRefreshToken?: () => string | null | Promise<string | null>
  /** Optional: called on successful refresh to persist new tokens. */
  setTokens?: (tokens: { accessToken: string; refreshToken: string }) => void | Promise<void>
}

/**
 * Refresh-on-401 configuration. Omit to disable auto-refresh.
 */
export type RefreshConfig = {
  /** Full URL to the refresh endpoint. */
  endpoint: string
  /**
   * How to build the refresh request body from the refresh token.
   * Default: `{ refreshToken }`.
   */
  buildBody?: (refreshToken: string) => unknown
  /**
   * How to extract new tokens from the refresh response.
   * Default: looks up `accessToken`/`refreshToken` (or snake_case)
   * inside `body.data` then `body`.
   */
  parseResponse?: (body: unknown) => { accessToken: string; refreshToken: string } | null
}

/**
 * Response envelope handling.
 */
export type EnvelopeConfig = {
  /** When true, detect `{ success: true, data: T }` and unwrap to `data`. */
  unwrap: boolean
  /** Detect `{ success: false }` on 2xx responses and throw `ApiError`. */
  throwOnFailureEnvelope: boolean
}

/**
 * Optional logger. Defaults to a silent no-op implementation (industry
 * convention — callers opt-in by passing their own logger).
 */
export type ClientLogger = {
  warn: (msg: string, data?: unknown) => void
  debug: (msg: string, data?: unknown) => void
}

/**
 * Resolves the base URL for a request.
 *
 * - Function: receives the optional `appName` string → returns base URL.
 * - Absolute URL string: used as-is for every call.
 * - `null`: caller MUST provide an absolute URL via `endpoint` or
 *   per-call `baseUrl`.
 */
export type BaseUrlResolver = string | null | ((appName: string | undefined) => string)

/**
 * CSRF double-submit configuration for cookie-authenticated writes.
 *
 * When provided, `apiCall` attaches the `X-CSRF-Token` header (read from the
 * non-httpOnly `csrf-token` cookie) on state-changing cookie-auth requests
 * (POST/PUT/PATCH/DELETE with `credentials: 'include'` and no `Authorization:
 * Bearer` header). GET/HEAD and Bearer-auth requests are untouched. Omit the
 * config entirely to disable CSRF handling (default — fully backward-compatible).
 *
 * @example
 * ```ts
 * const client = createApiClient({
 *   baseUrl: 'https://api.example.com',
 *   csrfConfig: {
 *     primeUrl: 'https://api.example.com/api/auth/login-cookie/csrf',
 *   },
 * })
 * ```
 */
export type CsrfConfig = {
  /**
   * Name of the non-httpOnly cookie holding the double-submit token.
   * @default 'csrf-token'
   */
  cookieName?: string
  /**
   * Name of the request header the token is attached to.
   * @default 'X-CSRF-Token'
   */
  headerName?: string
  /**
   * Absolute URL of the idempotent GET endpoint that sets the CSRF cookie via
   * `Set-Cookie`. Called on cache miss (no cookie present) and on a 403 retry.
   * When omitted, the SDK never primes — it only reads an existing cookie.
   */
  primeUrl?: string
  /**
   * Decide whether a `403` response is a CSRF token mismatch (and therefore
   * worth re-priming + retrying once) rather than a genuine authorization
   * failure (email-verify gate, RBAC denial, etc.). The SDK peeks the parsed
   * 403 body and only retries when this returns `true`; any other 403
   * propagates to the caller unchanged (no extra prime GET, no retry POST).
   *
   * Defaults to a generic matcher that looks for `'csrf'` (case-insensitive)
   * in the parsed error message or code — this matches the
   * `@ezstart/api-core` server (`'CSRF token mismatch'`). Override it when the
   * upstream server signals CSRF mismatches with a different message/code.
   *
   * @param status - The response status (always `403` when invoked).
   * @param body - The parsed 403 body (`null` when empty / non-JSON).
   * @default matches `'csrf'` in the error message or code
   */
  mismatchMatcher?: (status: number, body: unknown) => boolean
}

/**
 * Configuration accepted by `createApiClient`.
 */
export type ApiClientConfig = {
  /** Resolve base URL — see `BaseUrlResolver`. */
  baseUrl?: BaseUrlResolver
  /** Token management. Omit for no-auth clients. */
  tokenStore?: TokenStore
  /** Auto-refresh on 401. Omit to disable. */
  refresh?: RefreshConfig
  /** Response envelope handling. Default: `{ unwrap: true, throwOnFailureEnvelope: true }`. */
  envelope?: Partial<EnvelopeConfig>
  /** Default credentials mode. Default `'include'`. */
  credentials?: RequestCredentials
  /** Prefix appended to endpoints unless already present. Default `'/api'`. Empty string disables. */
  pathPrefix?: string
  /** Logger override. Default is silent (no-op). */
  logger?: ClientLogger
  /**
   * CSRF double-submit config for cookie-auth writes. Omit to disable (default).
   * See {@link CsrfConfig}.
   */
  csrfConfig?: CsrfConfig
}

/** Response shape requested by the caller (default `'json'`). */
export type ResponseType = 'json' | 'text' | 'blob' | 'arrayBuffer' | 'raw'

/**
 * Options accepted by `apiCall`.
 */
export type ApiCallOptions = {
  /** App name passed to the configured `baseUrl` resolver, when it is a function. */
  appName?: string
  /** HTTP method. Default `GET`. */
  method?: HttpMethod
  /** Body payload. `FormData` and `URLSearchParams` are passed through, other objects are JSON-stringified. */
  body?: unknown
  /** Query string parameters; `undefined` and `null` are skipped. */
  query?: QueryParams
  /** Extra headers merged with the computed ones. */
  headers?: Record<string, string>
  /** AbortSignal for cancellation. */
  signal?: AbortSignal
  /** Skip automatic `Authorization: Bearer` injection. Default `false`. */
  skipAuth?: boolean
  /** Skip automatic refresh-on-401 retry. Default `false`. */
  skipRefresh?: boolean
  /** Credentials mode override. Falls back to the client default. */
  credentials?: RequestCredentials
  /** Per-call base URL override. Bypasses the resolver. */
  baseUrl?: string
  /**
   * When `true`, skip the automatic envelope unwrap and return
   * the parsed body as-is. Useful for paginated endpoints where the caller
   * needs access to the `meta` field.
   *
   * @default false
   */
  preserveEnvelope?: boolean
  /** Per-call token getter override. */
  getToken?: () => string | null | Promise<string | null>
  /**
   * Response type — default `'json'`.
   * - `'json'`        : parse JSON body, apply envelope handling.
   * - `'text'`        : return raw body string.
   * - `'blob'`        : return `Blob` (binary downloads).
   * - `'arrayBuffer'` : return `ArrayBuffer`.
   * - `'raw'`         : return the `Response` itself (escape hatch).
   *
   * For non-JSON response types, envelope unwrap is skipped on success.
   */
  responseType?: ResponseType
  /**
   * Idempotency key for safe retry of mutating requests.
   *
   * - `'auto'`   : SDK generates an RFC 4122 v4 UUID via `crypto.randomUUID()`
   * - `string`   : caller-provided key (must match RFC 4122 v4 format —
   *                `@ezstart/api-core` rejects anything else with HTTP 400)
   * - omitted    : no `Idempotency-Key` header sent (backward compatible)
   *
   * Sent as the `Idempotency-Key` request header. Pairs with the
   * `createIdempotencyMiddleware` from `@ezstart/api-core` which dedups
   * for 24 h.
   *
   * Only meaningful on mutating methods (POST/PUT/PATCH/DELETE). The header
   * is sent regardless of method — the server ignores it on GET. The SDK
   * does NOT auto-restrict to mutating methods so a consumer can opt-in
   * for a custom GET-with-side-effects pattern if needed.
   *
   * If the caller also passes an `Idempotency-Key` (any case) inside
   * `headers`, that explicit header wins — `idempotencyKey` is ignored
   * for the duplicate (caller-supplied headers always take precedence,
   * mirroring the `Authorization` / `Content-Type` / `Accept` policy).
   *
   * @example
   * ```ts
   * // Auto-generated UUID (most common case)
   * await client.apiCall('/donations', {
   *   method: 'POST',
   *   body,
   *   idempotencyKey: 'auto',
   * })
   * ```
   *
   * @example
   * ```ts
   * // Caller-supplied (deterministic key tied to a business ID)
   * await client.apiCall('/refunds', {
   *   method: 'POST',
   *   body: { chargeId: 'ch_123' },
   *   idempotencyKey: `refund-ch_123-${Date.now()}`,
   * })
   * ```
   */
  idempotencyKey?: string | 'auto'
}

/**
 * Callbacks accepted by `apiStream`.
 */
export type StreamCallbacks = {
  onChunk: (data: unknown) => void
  onError?: (err: unknown) => void
  onDone?: () => void
}
