import type { AppName } from '@ezstart/config/urls'
import { getApiUrl } from '@ezstart/config/urls'
import type { ApiError, ApiMeta, ApiResponse, CallApiOptions, LogLevel } from './types'

/**
 * Get access token from auth store if available (browser only)
 * This allows callApi to automatically inject JWT tokens for cross-domain requests
 */
function getAccessTokenFromStore(customGetToken?: () => string | null): string | null {
  if (customGetToken) return customGetToken()

  if (typeof window === 'undefined') return null

  try {
    // Access Zustand store directly from localStorage (default fallback)
    const stored = localStorage.getItem('ezauth-storage')
    if (!stored) return null

    const parsed = JSON.parse(stored)
    return parsed?.state?.accessToken || null
  } catch {
    return null
  }
}

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
 * // Cross-domain request with JWT
 * const response = await callApi<User>('/admin/users', {
 *   appName: 'ezauth',
 *   accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
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
  const {
    method = 'GET',
    query,
    body,
    headers = {},
    signal,
    userId,
    accessToken,
    appName,
    logLevel,
    getToken,
  } = options

  // Auto-inject access token for cross-domain requests if not explicitly provided
  let finalAccessToken = accessToken
  if (!finalAccessToken && typeof window !== 'undefined') {
    // Detect auth mode using same logic as @ezstart/auth-sdk
    const currentHost = window.location.hostname
    const isLocalhost = currentHost === 'localhost' || currentHost.startsWith('127.0.0.1')

    if (!isLocalhost) {
      // Check if this is a cross-domain request
      const apiUrl = getApiUrl(appName)
      const apiHost = new URL(apiUrl).hostname

      const getRootDomain = (hostname: string) => {
        const parts = hostname.split('.')
        if (parts.length <= 2) return hostname
        return parts.slice(-2).join('.')
      }

      const currentRootDomain = getRootDomain(currentHost)
      const apiRootDomain = getRootDomain(apiHost)

      // If cross-domain, auto-inject token from store
      if (currentRootDomain !== apiRootDomain) {
        finalAccessToken = getAccessTokenFromStore(getToken) || undefined
      }
    }
  }

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
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData
  const isFormUrlEncoded = body instanceof URLSearchParams
  const isStringBody = typeof body === 'string'
  const isJsonBody = !isFormData && !isFormUrlEncoded && !isStringBody

  // Log request if enabled
  if (effectiveLogLevel === 'all') {
    console.group(`🌐 [callApi] ${method} ${url}`)
    console.log('📤 Request:', {
      method,
      url,
      query,
      body,
      headers: {
        ...headers,
        ...(userId ? { 'X-User-Id': userId } : {}),
        ...(finalAccessToken ? { Authorization: `Bearer ${finalAccessToken}` } : {}),
      },
    })
  }

  const startTime = Date.now()

  try {
    const res = await fetch(url, {
      method,
      headers: {
        ...(isJsonBody ? { 'Content-Type': 'application/json' } : {}),
        ...(userId ? { 'X-User-Id': userId } : {}),
        ...(finalAccessToken ? { Authorization: `Bearer ${finalAccessToken}` } : {}),
        ...headers,
      },
      body: isFormData
        ? body
        : isFormUrlEncoded
          ? body
          : isStringBody
            ? body
            : body
              ? JSON.stringify(body)
              : undefined,
      credentials: 'include', // Required for httpOnly cookies in cross-origin requests
      signal,
    })

    const duration = Date.now() - startTime

    // Parse response body
    let json: any = null
    try {
      json = await res.json()
    } catch {
      // Non-JSON response (e.g., 204 No Content)
      json = null
    }

    // Auto-unwrap standardized API response { success, data, meta }
    const isStandardResponse = json && typeof json === 'object' && 'success' in json

    if (res.ok) {
      // Log successful response if enabled
      if (effectiveLogLevel === 'all') {
        console.log(`✅ Response [${res.status}] (${duration}ms):`, json)
        console.groupEnd()
      }

      if (isStandardResponse) {
        return {
          ok: true as const,
          status: res.status,
          url: res.url,
          data: (json.data ?? json) as T,
          meta: json.meta as ApiMeta | undefined,
          raw: json,
        }
      }

      return {
        ok: true as const,
        status: res.status,
        url: res.url,
        data: json as T,
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
          response: json,
        })
        console.groupEnd()
      }

      if (isStandardResponse) {
        return {
          ok: false as const,
          status: res.status,
          url: res.url,
          data: json.data as ApiError | null,
          meta: json.meta as ApiMeta | undefined,
          error: json.error as string | undefined,
          raw: json,
        }
      }

      return {
        ok: false as const,
        status: res.status,
        url: res.url,
        data: json as ApiError | null,
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

/**
 * Factory that returns a callApi function with appName pre-bound,
 * plus React Query helpers (queryKey, queryFn).
 *
 * The returned value is callable directly (backwards compatible)
 * AND has `.queryKey()` / `.queryFn()` helpers for React Query.
 *
 * @example
 * ```ts
 * const api = createCallApi('ezbill')
 *
 * // Direct call (backwards compatible)
 * const res = await api<User[]>('/users')
 *
 * // React Query helpers
 * const { data } = useQuery({
 *   queryKey: api.queryKey('/users', { page: 1 }),
 *   queryFn: api.queryFn('/users', { page: 1 }),
 * })
 * ```
 */
export function createCallApi(
  appName: AppName,
  factoryOptions?: { getToken?: () => string | null }
) {
  const call = <T = any>(endpoint: string, options: Omit<CallApiOptions, 'appName'> = {}) => {
    return baseCallApi<T>(endpoint, {
      ...options,
      appName,
      getToken: options.getToken ?? factoryOptions?.getToken,
    })
  }

  return Object.assign(call, {
    /** Generate a React Query key: [appName, endpoint, params?] */
    queryKey: (endpoint: string, params?: Record<string, any>) =>
      [appName, endpoint, ...(params ? [params] : [])] as const,

    /** Generate a React Query queryFn that calls this endpoint and returns data */
    queryFn:
      <T = any>(endpoint: string, params?: Record<string, any>) =>
      async () => {
        const query = params
          ? '?' +
            new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString()
          : ''
        const response = await call<T>(endpoint + query)
        return response.data
      },
  })
}

// Alias for createCallApi factory usage
const baseCallApi = callApi
