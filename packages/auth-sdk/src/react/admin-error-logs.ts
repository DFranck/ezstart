'use client'

/**
 * React Query hooks for the admin Error Logs dashboard (superadmin only).
 *
 * Companion endpoints (apps/ezauth/api/src/routes/admin/error-logs.ts):
 *   - GET /admin/error-logs        — paginated list + filters
 *   - GET /admin/error-logs/:id    — full detail (stack + context)
 *
 * Federated-admin friendly: optional `apiUrl` + `authToken` so the hook
 * can be used from a Tier 3 hub embedding the SDK against a remote
 * EZAuth deployment.
 *
 * Peer dependencies: `@tanstack/react-query`, `@ezstart/api-sdk`.
 *
 * @module @ezstart/auth-sdk/react/admin-error-logs
 */

import { apiCall } from '@ezstart/api-sdk'
import { useQuery, type UseQueryResult } from '@tanstack/react-query'

// ---------------------------------------------------------------------------
// Public types — kept local to avoid leaking server-side Mongoose types into
// the SDK surface. Mirror the route's response schema.
// ---------------------------------------------------------------------------

export type ErrorLogLevel = 'error' | 'warn' | 'fatal'
export type ErrorLogStatusRange = '4xx' | '5xx'

/** List-view entry (no stack, no context — kept lightweight). */
export interface ErrorLogListEntry {
  _id: string
  timestamp: string
  level: ErrorLogLevel
  message: string
  errorName?: string
  url?: string
  method?: string
  statusCode?: number
  userId?: string
  ip?: string
  env?: string
}

/** Full detail entry — includes stack, userAgent, releaseSha, context. */
export interface ErrorLogDetailEntry extends ErrorLogListEntry {
  stack?: string
  userAgent?: string
  releaseSha?: string
  context?: Record<string, unknown>
}

export interface ErrorLogListResponse {
  items: ErrorLogListEntry[]
  total: number
  limit: number
  offset: number
}

export interface ErrorLogListFilters {
  limit?: number
  offset?: number
  level?: ErrorLogLevel
  statusCodeRange?: ErrorLogStatusRange
  url?: string
  userId?: string
}

interface UseErrorLogsOptions {
  apiUrl?: string
  authToken?: string | (() => string | Promise<string>)
  enabled?: boolean
  /** Auto-refresh interval in ms. `0` disables polling (default). */
  refetchIntervalMs?: number
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

function listKey(filters: ErrorLogListFilters) {
  return [
    'admin',
    'error-logs',
    'list',
    {
      limit: filters.limit ?? null,
      offset: filters.offset ?? null,
      level: filters.level ?? null,
      statusCodeRange: filters.statusCodeRange ?? null,
      url: filters.url ?? null,
      userId: filters.userId ?? null,
    },
  ] as const
}

function detailKey(id: string) {
  return ['admin', 'error-logs', 'detail', id] as const
}

function toGetToken(value: string | (() => string | Promise<string>)) {
  return async (): Promise<string | null> => {
    const v = typeof value === 'function' ? await value() : value
    return v || null
  }
}

function buildQueryString(filters: ErrorLogListFilters): string {
  const params = new URLSearchParams()
  if (filters.limit !== undefined) params.set('limit', String(filters.limit))
  if (filters.offset !== undefined) params.set('offset', String(filters.offset))
  if (filters.level) params.set('level', filters.level)
  if (filters.statusCodeRange) params.set('statusCodeRange', filters.statusCodeRange)
  if (filters.url) params.set('url', filters.url)
  if (filters.userId) params.set('userId', filters.userId)
  const qs = params.toString()
  return qs.length > 0 ? `?${qs}` : ''
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/**
 * Fetch the paginated list of recent error logs (superadmin only).
 *
 * The API returns a `{ success, data, meta }` envelope; we normalize
 * to a `{ items, total, limit, offset }` shape consistent with the
 * audit-log hook so the UI consumer doesn't need to peek at meta.
 *
 * @example
 * ```tsx
 * const { data, isLoading } = useAdminErrorLogs({ limit: 50, level: 'error' })
 * ```
 */
export function useAdminErrorLogs(
  filters: ErrorLogListFilters = {},
  options: UseErrorLogsOptions = {}
): UseQueryResult<ErrorLogListResponse> {
  const { apiUrl, authToken, enabled = true, refetchIntervalMs = 0 } = options

  return useQuery<ErrorLogListResponse>({
    queryKey: listKey(filters),
    queryFn: async () => {
      const path = `/admin/error-logs${buildQueryString(filters)}`
      // Preserve the envelope so we can surface `meta.total` for pagination.
      const envelope = await apiCall<{
        success: true
        data: ErrorLogListEntry[]
        meta: { total: number; limit: number; offset: number }
      }>(path, {
        appName: 'ezauth',
        method: 'GET',
        preserveEnvelope: true,
        ...(apiUrl ? { baseUrl: apiUrl } : {}),
        ...(authToken !== undefined ? { getToken: toGetToken(authToken) } : {}),
      })
      return {
        items: envelope.data,
        total: envelope.meta.total,
        limit: envelope.meta.limit,
        offset: envelope.meta.offset,
      }
    },
    enabled,
    ...(refetchIntervalMs > 0 ? { refetchInterval: refetchIntervalMs } : {}),
  })
}

/**
 * Fetch the full detail of a single error log entry (stack + context).
 */
export function useAdminErrorLogDetail(
  id: string | null,
  options: UseErrorLogsOptions = {}
): UseQueryResult<ErrorLogDetailEntry> {
  const { apiUrl, authToken, enabled = true } = options

  return useQuery<ErrorLogDetailEntry>({
    queryKey: detailKey(id ?? ''),
    queryFn: () =>
      apiCall<ErrorLogDetailEntry>(`/admin/error-logs/${id}`, {
        appName: 'ezauth',
        method: 'GET',
        ...(apiUrl ? { baseUrl: apiUrl } : {}),
        ...(authToken !== undefined ? { getToken: toGetToken(authToken) } : {}),
      }),
    enabled: enabled && Boolean(id),
  })
}
