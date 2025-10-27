import type { AppName } from '@ezstart/config/urls'

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

export type ApiError = { error: string; [key: string]: any }

export type ApiResponse<T> =
  | { ok: true; status: number; url: string; data: T }
  | { ok: false; status: number; url: string; data: ApiError | null }

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
  /** App name to automatically resolve API URL from @ezstart/config (REQUIRED) */
  appName: AppName
}
