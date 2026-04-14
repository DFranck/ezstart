import { ApiError } from './api-error.js'
import { resolveBaseUrl, type ResolvedConfig } from './internal/config.js'
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
        const rawEvent = buffer.slice(0, sepIndex)
        buffer = buffer.slice(sepIndex + 2)

        const parsed = parseEvent(rawEvent)
        if (parsed) {
          if (parsed.event === 'error') {
            let errorPayload: unknown = parsed.data
            try {
              errorPayload = JSON.parse(parsed.data)
            } catch {
              // keep raw string
            }
            const message = parseApiError(errorPayload) ?? 'Stream error'
            const err = new ApiError(message, {
              status: res.status,
              code: parseApiErrorCode(errorPayload),
              data: errorPayload,
            })
            if (callbacks.onError) callbacks.onError(err)
            else throw err
          } else if (parsed.data === '[DONE]') {
            if (callbacks.onDone) callbacks.onDone()
            return
          } else {
            let payload: unknown = parsed.data
            try {
              payload = JSON.parse(parsed.data)
            } catch {
              // keep raw string if not JSON
            }
            callbacks.onChunk(payload)
          }
        }

        sepIndex = buffer.indexOf('\n\n')
      }
    }

    if (callbacks.onDone) callbacks.onDone()
  } finally {
    try {
      reader.releaseLock()
    } catch {
      // ignore
    }
  }
}

function buildStreamInit(
  method: string,
  body: unknown,
  headers: Record<string, string>,
  token: string | null,
  credentials: RequestCredentials,
  signal?: AbortSignal
): RequestInit {
  const { payload, isJsonBody } = buildBody(body)
  const finalHeaders = buildHeaders(headers, token, {
    json: isJsonBody,
    accept: 'text/event-stream',
  })

  return {
    method,
    headers: finalHeaders,
    body: payload,
    credentials,
    signal,
  }
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
    const init = buildStreamInit(method, body, headers, token, credentials, signal)

    const callbacks: StreamCallbacks = { onChunk, onError, onDone }

    let res: Response
    try {
      res = await fetch(url, init)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Network request failed'
      resolved.logger.warn('[apiStream] Network error', { url, method, error: message })
      throw new ApiError(message, { status: 0, code: 'NETWORK_ERROR' })
    }

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
        resolved.logger.debug('[apiStream] Token refreshed, retrying request', { url, method })
        const retryInit = buildStreamInit(method, body, headers, newToken, credentials, signal)

        try {
          res = await fetch(url, retryInit)
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Network request failed'
          resolved.logger.warn('[apiStream] Network error', { url, method, error: message })
          throw new ApiError(message, { status: 0, code: 'NETWORK_ERROR' })
        }
      }
    }

    if (!res.ok) {
      const text = await res.text()
      let parsed: unknown = text
      try {
        parsed = JSON.parse(text)
      } catch {
        // keep raw string
      }
      const message = parseApiError(parsed) ?? `Stream request failed with status ${res.status}`
      throw new ApiError(message, {
        status: res.status,
        code: parseApiErrorCode(parsed),
        data: parsed,
        retryAfter: parseRetryAfter(parsed),
      })
    }

    await streamResponse(res, callbacks)
  }
}
