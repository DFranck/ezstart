import { ApiError } from './api-error.js'
import { resolveBaseUrl, type ResolvedConfig } from './internal/config.js'
import { fetchWithRetry } from './internal/fetch-with-retry.js'
import type { RefreshHelper } from './internal/refresh.js'
import { buildBody, buildHeaders } from './internal/request.js'
import { buildUrl } from './internal/url.js'
import { parseApiError, parseApiErrorCode, parseRetryAfter } from './parse-api-error.js'
import type { ApiCallOptions, StreamCallbacks } from './types.js'

/**
 * @internal
 */
function parseEvent(block: string): { data: string; event?: string } | null {
  const lines = block.split(/\r?\n/)
  const dataLines: string[] = []
  let event: string | undefined

  for (const line of lines) {
    if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).replace(/^ /, ''))
    } else if (line.startsWith('event:')) {
      event = line.slice(6).trim()
    }
  }

  if (dataLines.length === 0) return null
  return { data: dataLines.join('\n'), event }
}

/**
 * @internal
 *
 * Dispatch a single parsed SSE event to the appropriate callback.
 * Returns `true` when the stream should stop (received `[DONE]`).
 */
function dispatchEvent(
  parsed: { data: string; event?: string },
  status: number,
  callbacks: StreamCallbacks
): boolean {
  if (parsed.event === 'error') {
    let errorPayload: unknown = parsed.data
    try {
      errorPayload = JSON.parse(parsed.data)
    } catch {
      /* keep raw */
    }
    const message = parseApiError(errorPayload) ?? 'Stream error'
    const err = new ApiError(message, {
      status,
      code: parseApiErrorCode(errorPayload),
      data: errorPayload,
    })
    if (callbacks.onError) callbacks.onError(err)
    else throw err
    return false
  }
  if (parsed.data === '[DONE]') {
    if (callbacks.onDone) callbacks.onDone()
    return true
  }
  let payload: unknown = parsed.data
  try {
    payload = JSON.parse(parsed.data)
  } catch {
    /* keep raw */
  }
  callbacks.onChunk(payload)
  return false
}

async function streamResponse(res: Response, callbacks: StreamCallbacks): Promise<void> {
  if (!res.body) {
    throw new ApiError('Response has no readable body', { status: res.status })
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      let sepIndex = buffer.indexOf('\n\n')

      while (sepIndex !== -1) {
        const parsed = parseEvent(buffer.slice(0, sepIndex))
        buffer = buffer.slice(sepIndex + 2)
        if (parsed && dispatchEvent(parsed, res.status, callbacks)) return
        sepIndex = buffer.indexOf('\n\n')
      }
    }
    if (callbacks.onDone) callbacks.onDone()
  } finally {
    try {
      reader.releaseLock()
    } catch {
      /* ignore */
    }
  }
}

/**
 * @internal
 *
 * Build a RequestInit factory for stream requests (Accept: text/event-stream).
 */
function buildStreamInit(
  method: string,
  body: unknown,
  headers: Record<string, string>,
  credentials: RequestCredentials,
  signal?: AbortSignal
): (token: string | null) => RequestInit {
  const { payload, isJsonBody } = buildBody(body)

  return (token: string | null) => ({
    method,
    headers: buildHeaders(headers, token, { json: isJsonBody, accept: 'text/event-stream' }),
    body: payload,
    credentials,
    signal,
  })
}

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
 * Parse an error response body for a failed stream request.
 */
function throwStreamError(status: number, text: string): never {
  let parsed: unknown = text
  try {
    parsed = JSON.parse(text)
  } catch {
    /* keep raw */
  }
  const message = parseApiError(parsed) ?? `Stream request failed with status ${status}`
  throw new ApiError(message, {
    status,
    code: parseApiErrorCode(parsed),
    data: parsed,
    retryAfter: parseRetryAfter(parsed),
  })
}

/**
 * @internal
 *
 * Factory: build an `apiStream` function bound to the resolved config.
 */
export function createApiStream(resolved: ResolvedConfig, refreshHelper: RefreshHelper) {
  return async function apiStream(
    endpoint: string,
    options: ApiCallOptions & StreamCallbacks
  ): Promise<void> {
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
      onChunk,
      onError,
      onDone,
    } = options

    const baseUrl = baseUrlOverride ?? resolveBaseUrl(resolved.baseUrl, appName)
    const url = buildUrl(baseUrl, endpoint, resolved.pathPrefix, query)

    const tokenResult = resolveToken(resolved, options)
    const token = tokenResult instanceof Promise ? await tokenResult : tokenResult
    const initFactory = buildStreamInit(method, body, headers, credentials, signal)

    const res = await fetchWithRetry({
      url,
      method,
      buildInit: initFactory,
      token,
      skipRefresh,
      skipAuth: options.skipAuth ?? false,
      resolved,
      refreshHelper,
      tag: 'apiStream',
    })

    if (!res.ok) throwStreamError(res.status, await res.text())
    await streamResponse(res, { onChunk, onError, onDone })
  }
}
