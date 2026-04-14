import { ApiError } from './api-error.js'
import { resolveBaseUrl, type ResolvedConfig } from './internal/config.js'
import type { RefreshHelper } from './internal/refresh.js'
import { buildBody, buildHeaders } from './internal/request.js'
import { buildUrl } from './internal/url.js'
import { parseApiError, parseApiErrorCode, parseRetryAfter } from './parse-api-error.js'
import type { ApiCallOptions, ResponseType } from './types.js'

/**
 * @internal
 *
 * Build fetch init from options. Encodes JSON bodies, passes through
 * `FormData`/`URLSearchParams`, applies headers and credentials.
 */
function buildInit(
  method: string,
  body: unknown,
  headers: Record<string, string>,
  token: string | null,
  credentials: RequestCredentials,
  signal?: AbortSignal,
  accept?: string
): RequestInit {
  const { payload, isJsonBody } = buildBody(body)
  const finalHeaders = buildHeaders(headers, token, { json: isJsonBody, accept })

  return {
    method,
    headers: finalHeaders,
    body: payload,
    credentials,
    signal,
  }
}

/**
 * @internal
 *
 * Parse a Response's JSON body, tolerating empty / non-JSON responses.
 */
async function safeParseJson(res: Response): Promise<unknown> {
  const text = await res.text()
  if (text.length === 0) return null
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

/**
 * @internal
 *
 * Detect an explicit business-failure envelope: `{ success: false, ... }`.
 */
function isFailureEnvelope(body: unknown): boolean {
  return (
    body !== null &&
    typeof body === 'object' &&
    'success' in body &&
    (body as { success?: unknown }).success === false
  )
}

/**
 * @internal
 *
 * Unwrap the standard `{ success, data, meta }` envelope. When the body
 * is already unwrapped (raw object), returns it as-is.
 */
function unwrapSuccess<T>(body: unknown): T {
  if (body !== null && typeof body === 'object' && 'success' in body) {
    const envelope = body as { success?: unknown; data?: unknown }
    if (envelope.success === true) {
      return (envelope.data ?? envelope) as T
    }
  }
  return body as T
}

/**
 * @internal
 */
function toApiError(status: number, body: unknown, fallbackMessage: string): ApiError {
  const message = parseApiError(body) ?? fallbackMessage
  const code = parseApiErrorCode(body)
  const retryAfter = parseRetryAfter(body)
  return new ApiError(message, { status, code, data: body, retryAfter })
}

/**
 * @internal
 *
 * Read a non-JSON response body according to the requested type.
 */
async function readNonJsonBody(res: Response, type: ResponseType): Promise<unknown> {
  switch (type) {
    case 'text':
      return res.text()
    case 'blob':
      return res.blob()
    case 'arrayBuffer':
      return res.arrayBuffer()
    case 'raw':
      return res
    case 'json':
    default:
      return safeParseJson(res)
  }
}

/**
 * @internal
 *
 * Resolve the access token for the current call. Returns a value directly
 * when the resolver is synchronous to avoid an unnecessary microtask
 * (matters for callers that race the call against `AbortController.abort()`).
 */
function resolveToken(
  resolved: ResolvedConfig,
  options: ApiCallOptions
): string | null | Promise<string | null> {
  if (options.skipAuth) return null
  if (options.getToken) {
    const t = options.getToken()
    if (t instanceof Promise) return t.then(v => v ?? null)
    return t ?? null
  }
  if (resolved.tokenStore) {
    const t = resolved.tokenStore.getAccessToken()
    if (t instanceof Promise) return t.then(v => v ?? null)
    return t ?? null
  }
  return null
}

/**
 * @internal
 *
 * Factory: build an `apiCall` function bound to the resolved config.
 */
export function createApiCall(resolved: ResolvedConfig, refreshHelper: RefreshHelper) {
  return async function apiCall<T = unknown>(
    endpoint: string,
    options: ApiCallOptions = {}
  ): Promise<T> {
    const {
      appName,
      method = 'GET',
      body,
      query,
      headers = {},
      signal,
      skipRefresh = false,
      credentials = resolved.credentials,
      baseUrl: baseUrlOverride,
      preserveEnvelope = false,
      responseType = 'json',
    } = options

    const baseUrl = baseUrlOverride ?? resolveBaseUrl(resolved.baseUrl, appName)
    const url = buildUrl(baseUrl, endpoint, resolved.pathPrefix, query)

    const tokenResult = resolveToken(resolved, options)
    const token = tokenResult instanceof Promise ? await tokenResult : tokenResult
    const init = buildInit(method, body, headers, token, credentials, signal)

    let res: Response
    try {
      res = await fetch(url, init)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Network request failed'
      resolved.logger.warn('[apiCall] Network error', { url, method, error: message })
      throw new ApiError(message, { status: 0, code: 'NETWORK_ERROR' })
    }

    // Auto-refresh on 401 (single-flight), retry once.
    const canRefresh =
      res.status === 401 &&
      !skipRefresh &&
      !options.skipAuth &&
      token !== null &&
      Boolean(resolved.refresh) &&
      Boolean(resolved.tokenStore?.getRefreshToken)

    if (canRefresh) {
      const newToken = await refreshHelper.refresh()
      if (newToken) {
        resolved.logger.debug('[apiCall] Token refreshed, retrying request', { url, method })
        const retryInit = buildInit(method, body, headers, newToken, credentials, signal)

        let retryRes: Response
        try {
          retryRes = await fetch(url, retryInit)
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Network request failed'
          resolved.logger.warn('[apiCall] Network error', { url, method, error: message })
          throw new ApiError(message, { status: 0, code: 'NETWORK_ERROR' })
        }

        return finalizeResponse<T>(retryRes, responseType, preserveEnvelope, resolved)
      }
    }

    return finalizeResponse<T>(res, responseType, preserveEnvelope, resolved)
  }
}

/**
 * @internal
 */
async function finalizeResponse<T>(
  res: Response,
  responseType: ResponseType,
  preserveEnvelope: boolean,
  resolved: ResolvedConfig
): Promise<T> {
  // Non-JSON paths: read body once for both success and error.
  if (responseType !== 'json') {
    if (res.ok) {
      const value = await readNonJsonBody(res, responseType)
      return value as T
    }
    // Errors: still parse error body as JSON if possible (text fallback).
    const errBody = await safeParseJson(res)
    throw toApiError(res.status, errBody, `Request failed with status ${res.status}`)
  }

  const parsedBody = await safeParseJson(res)

  if (res.ok) {
    if (resolved.envelope.throwOnFailureEnvelope && isFailureEnvelope(parsedBody)) {
      throw toApiError(res.status, parsedBody, 'Request reported failure')
    }
    if (preserveEnvelope || !resolved.envelope.unwrap) {
      return parsedBody as T
    }
    return unwrapSuccess<T>(parsedBody)
  }

  throw toApiError(res.status, parsedBody, `Request failed with status ${res.status}`)
}
