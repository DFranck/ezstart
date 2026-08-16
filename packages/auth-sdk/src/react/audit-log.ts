'use client'

/**
 * React Query hook for the user activity audit log.
 *
 * Peer dependencies: `@tanstack/react-query`, `@ezstart/api-sdk`.
 */

import { apiCall } from '@ezstart/api-sdk'
import { useQuery } from '@tanstack/react-query'
import type { AuditLogFilters, AuditLogListResponse } from '../core/types.js'

/**
 * Stable query key factory for the audit log cache. Filters are normalized
 * so that React Query can dedupe pages even when callers pass them in
 * different orders.
 *
 * @internal
 */
function auditLogKey(filters: AuditLogFilters) {
  return [
    'audit-log',
    {
      limit: filters.limit ?? null,
      offset: filters.offset ?? null,
      action: filters.action ?? null,
    },
  ] as const
}

/** Options for {@link useAuditLog}. */
export interface UseAuditLogOptions {
  /**
   * Pre-resolved audit log response (from a server-side fetch via
   * `getServerAuditLog()`). When provided, React Query seeds the cache so
   * the first paint of `<AuditLogSection>` already shows the table — no
   * client `<Spinner>` flash. The hook still revalidates in the background
   * to keep the data fresh.
   */
  initialData?: AuditLogListResponse
}

/**
 * Fetch the current user's audit log entries.
 *
 * @example
 * ```tsx
 * const { data, isLoading } = useAuditLog({ limit: 20, offset: 0 })
 * ```
 *
 * SSR companion: pass server-side pre-fetched data to skip the initial
 * loading state.
 *
 * @example
 * ```tsx
 * const { data } = useAuditLog({ limit: 20 }, true, { initialData: serverEntries })
 * ```
 */
export function useAuditLog(
  filters: AuditLogFilters = {},
  enabled = true,
  options?: UseAuditLogOptions
) {
  return useQuery({
    queryKey: auditLogKey(filters),
    queryFn: () => {
      const params = new URLSearchParams()
      if (filters.limit !== undefined) params.set('limit', String(filters.limit))
      if (filters.offset !== undefined) params.set('offset', String(filters.offset))
      if (filters.action) params.set('action', filters.action)
      const qs = params.toString()
      const path = qs.length > 0 ? `/auth/me/audit-log?${qs}` : '/auth/me/audit-log'
      return apiCall<AuditLogListResponse>(path, {
        appName: 'ezauth',
        method: 'GET',
      })
    },
    enabled,
    initialData: options?.initialData,
  })
}
