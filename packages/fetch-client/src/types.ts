import type { AppName } from '@ezstart/config/urls'

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

export type ApiError = { error: string; [key: string]: any }

export type ApiResponse<T> =
  | { ok: true; status: number; url: string; data: T; meta?: ApiMeta; error?: undefined; raw?: any }
  | {
      ok: false
      status: number
      url: string
      data: ApiError | null
      meta?: ApiMeta
      error?: string
      raw?: any
    }

export type ApiMeta = { total?: number; limit?: number; offset?: number; [key: string]: any }

export type LogLevel = 'none' | 'errors' | 'all'

export type CallApiOptions = {
  /** HTTP method (default: GET) */
  method?: HttpMethod
  /** Query parameters to append to URL */
  query?: Record<string, any>
  /** Request body (will be JSON stringified) */
  body?: any
  /** Custom headers */
  headers?: Record<string, string>
  /** AbortSignal for request cancellation */
  signal?: AbortSignal
  /** User ID for X-User-Id header */
  userId?: string
  /** Access token for Authorization header (JWT mode for cross-domain) */
  accessToken?: string
  /** App name to automatically resolve API URL from @ezstart/config (REQUIRED) */
  appName: AppName
  /**
   * Log level for this request
   * - 'none': No logging
   * - 'errors': Only log errors (default)
   * - 'all': Log request + response for all calls
   *
   * Can also be controlled globally via localStorage: callApiLogLevel
   * @default 'errors'
   */
  logLevel?: LogLevel
  /**
   * Custom token resolver for cross-domain JWT injection.
   * When provided, this function is called instead of reading from localStorage.
   * Falls back to the default 'ezauth-storage' localStorage key if not set.
   */
  getToken?: () => string | null
}
