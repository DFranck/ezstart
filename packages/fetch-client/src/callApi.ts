import { getApiUrl } from '@ezstart/config/urls'
import type { ApiError, ApiResponse, CallApiOptions, LogLevel } from './types'

/**
 * Get global log level from localStorage (browser) or environment (server)
 */
function getGlobalLogLevel(): LogLevel {
  if (typeof window !== 'undefined' && window.localStorage) {
    const stored = localStorage.getItem('callApiLogLevel') as LogLevel | null
    if (stored === 'none' || stored === 'errors' || stored === 'all') {
      return stored
    }
  }
  // Server-side or no localStorage: check environment
  if (typeof process !== 'undefined' && process.env?.CALL_API_LOG_LEVEL) {
    const envLevel = process.env.CALL_API_LOG_LEVEL as LogLevel
    if (envLevel === 'none' || envLevel === 'errors' || envLevel === 'all') {
      return envLevel
    }
  }
  return 'errors' // Default
}

/**
 * Type-safe HTTP client for @ezstart monorepo
 *
 * Features:
 * - Automatic URL resolution from @ezstart/config
 * - Automatic /api prefix normalization
 * - JSON body serialization
 * - Configurable logging (none/errors/all)
 * - Error handling with detailed logging
 * - AbortSignal support for cancellation
 *
 * @example
 * ```ts
 * // GET request
 * const response = await callApi<User[]>('/users', { appName: 'ezbill' })
 *
 * // POST request
 * const response = await callApi<User>('/users', {
 *   appName: 'ezbill',
 *   method: 'POST',
 *   body: { name: 'John', email: 'john@example.com' }
 * })
 *
 * // With query params
 * const response = await callApi<Invoice[]>('/invoices', {
 *   appName: 'ezbill',
 *   query: { status: 'paid', limit: 10 }
 * })
 *
 * // Enable logging for specific call
 * const response = await callApi<User>('/users/123', {
 *   appName: 'ezbill',
 *   logLevel: 'all' // Log request + response
 * })
 *
 * // Enable logging globally in browser console:
 * localStorage.setItem('callApiLogLevel', 'all')
 * ```
 */
export async function callApi<T = any>(
  endpoint: string,
  options: CallApiOptions
): Promise<ApiResponse<T>> {
  const { method = 'GET', query, body, headers = {}, signal, userId, appName, logLevel } = options

  // Determine effective log level (option > global > default)
  const effectiveLogLevel = logLevel || getGlobalLogLevel()

  // Resolve base URL from @ezstart/config
  const baseUrl = getApiUrl(appName)

  // Normalize endpoint: ensure /api prefix
  const normalizedEndpoint = endpoint.startsWith('/api/')
    ? endpoint.slice(4)
    : endpoint.startsWith('/')
      ? endpoint
      : `/${endpoint}`

  let url = `${baseUrl}/api${normalizedEndpoint}`

  // Append query parameters
  if (query && Object.keys(query).length > 0) {
    const q = new URLSearchParams(query).toString()
    url += url.includes('?') ? `&${q}` : `?${q}`
  }

  // Determine body type
  const isFormUrlEncoded = body instanceof URLSearchParams
  const isStringBody = typeof body === 'string'
  const isJsonBody = !isFormUrlEncoded && !isStringBody

  // Log request if enabled
  if (effectiveLogLevel === 'all') {
    console.group(`🌐 [callApi] ${method} ${url}`)
    console.log('📤 Request:', {
      method,
      url,
      query,
      body,
      headers: { ...headers, ...(userId ? { 'X-User-Id': userId } : {}) },
    })
  }

  const startTime = Date.now()

  try {
    const res = await fetch(url, {
      method,
      headers: {
        ...(isJsonBody ? { 'Content-Type': 'application/json' } : {}),
        ...(userId ? { 'X-User-Id': userId } : {}),
        ...headers,
      },
      body: isFormUrlEncoded ? body : isStringBody ? body : body ? JSON.stringify(body) : undefined,
      credentials: 'include', // Required for httpOnly cookies in cross-origin requests
      signal,
    })

    const duration = Date.now() - startTime

    // Parse response body
    let data: T | ApiError | null = null
    try {
      data = (await res.json()) as T | ApiError
    } catch {
      // Non-JSON response (e.g., 204 No Content)
      data = null
    }

    if (res.ok) {
      // Log successful response if enabled
      if (effectiveLogLevel === 'all') {
        console.log(`✅ Response [${res.status}] (${duration}ms):`, data)
        console.groupEnd()
      }

      return {
        ok: true as const,
        status: res.status,
        url: res.url,
        data: data as T,
      }
    } else {
      // Log error details if enabled (errors or all)
      if (effectiveLogLevel === 'errors' || effectiveLogLevel === 'all') {
        if (effectiveLogLevel === 'errors') {
          console.group(`❌ [callApi] ${method} ${url} - ${res.status}`)
        }
        console.warn(`🔴 Response [${res.status}] (${duration}ms):`, {
          url,
          method,
          status: res.status,
          query,
          body,
          headers,
          response: data,
        })
        console.groupEnd()
      }

      return {
        ok: false as const,
        status: res.status,
        url: res.url,
        data: data as ApiError | null,
      }
    }
  } catch (err) {
    const duration = Date.now() - startTime

    // Log network error if enabled (errors or all)
    if (effectiveLogLevel === 'errors' || effectiveLogLevel === 'all') {
      if (effectiveLogLevel === 'errors') {
        console.group(`💥 [callApi] ${method} ${url} - NETWORK ERROR`)
      }
      console.error(`🔴 Fetch failed (${duration}ms):`, {
        error: (err as Error).message,
        endpoint,
        url,
        method,
        query,
        body,
      })
      console.groupEnd()
    }

    return {
      status: 0,
      ok: false,
      url,
      data: { error: 'Fetch failed', reason: (err as Error).message },
    }
  }
}
