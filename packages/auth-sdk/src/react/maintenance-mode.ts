'use client'

/**
 * React Query hooks for the platform maintenance-mode singleton.
 *
 * Peer dependencies: `@tanstack/react-query`, `@ezstart/api-sdk`.
 */

import { apiCall } from '@ezstart/api-sdk'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { MaintenanceMode, UpdateMaintenanceModeRequest } from '../core/types.js'

/** Stable query key for the maintenance-mode admin cache. */
const MAINTENANCE_MODE_KEY = ['admin', 'maintenance-mode'] as const
/** Stable query key for the public maintenance-status cache. */
const MAINTENANCE_STATUS_KEY = ['public', 'maintenance-status'] as const

interface AdminFetchOptions {
  apiUrl?: string
  authToken?: string | (() => string | Promise<string>)
}

interface MutationCallbacks<T = void> {
  onSuccess?: (data: T) => void
  onError?: (error: Error) => void
}

function buildGetTokenOption(authToken: AdminFetchOptions['authToken']): {
  getToken?: () => Promise<string | null>
} {
  if (authToken === undefined) return {}
  return {
    getToken: async () => {
      if (typeof authToken === 'function') {
        const value = await authToken()
        return value || null
      }
      return authToken || null
    },
  }
}

/**
 * Fetch the maintenance-mode singleton (admin).
 *
 * @example
 * ```tsx
 * const { data, isLoading } = useMaintenanceMode()
 * ```
 */
export function useMaintenanceMode(options: AdminFetchOptions & { enabled?: boolean } = {}) {
  const { enabled = true, apiUrl, authToken } = options
  return useQuery({
    queryKey: MAINTENANCE_MODE_KEY,
    queryFn: () =>
      apiCall<MaintenanceMode>('/admin/maintenance-mode', {
        appName: 'ezauth',
        method: 'GET',
        ...(apiUrl ? { baseUrl: apiUrl } : {}),
        ...buildGetTokenOption(authToken),
      }),
    enabled,
  })
}

/**
 * Mutation to update the maintenance-mode singleton.
 *
 * @example
 * ```tsx
 * const update = useUpdateMaintenanceMode()
 * update.mutate({ enabled: true, message: 'Back at 18:00 UTC' })
 * ```
 */
export function useUpdateMaintenanceMode(
  callbacks?: MutationCallbacks<MaintenanceMode> & AdminFetchOptions
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: UpdateMaintenanceModeRequest) =>
      apiCall<MaintenanceMode>('/admin/maintenance-mode', {
        appName: 'ezauth',
        method: 'PUT',
        body,
        ...(callbacks?.apiUrl ? { baseUrl: callbacks.apiUrl } : {}),
        ...buildGetTokenOption(callbacks?.authToken),
      }),
    onSuccess: data => {
      queryClient.invalidateQueries({ queryKey: [...MAINTENANCE_MODE_KEY] })
      queryClient.invalidateQueries({ queryKey: [...MAINTENANCE_STATUS_KEY] })
      callbacks?.onSuccess?.(data)
    },
    onError: (error: Error) => {
      callbacks?.onError?.(error)
    },
  })
}

/**
 * Fetch the public maintenance status (no auth required).
 *
 * Used by consumer apps to render `<MaintenanceBanner>` platform-wide.
 *
 * Resilient by design: if the API is unreachable or returns an error,
 * the hook silently degrades (no thrown error visible to consumers, no
 * retry storm) so the banner stays hidden and the app keeps functioning.
 *
 * @example
 * ```tsx
 * const { data } = useMaintenanceStatus({ apiUrl: 'https://auth.example.com' })
 * if (data?.enabled) return <MaintenanceBanner status={data} />
 * ```
 */
export function useMaintenanceStatus(
  options: { apiUrl?: string; enabled?: boolean; refetchIntervalMs?: number } = {}
) {
  const { apiUrl, enabled = true, refetchIntervalMs = 60_000 } = options
  return useQuery({
    queryKey: MAINTENANCE_STATUS_KEY,
    queryFn: async () => {
      try {
        return await apiCall<MaintenanceMode>('/maintenance-status', {
          appName: 'ezauth',
          method: 'GET',
          ...(apiUrl ? { baseUrl: apiUrl } : {}),
        })
      } catch {
        // Public banner must never break the consumer app — fall back to
        // "no maintenance" when the upstream lookup fails for any reason.
        return {
          enabled: false,
          message: '',
          startedAt: null,
          scheduledEnd: null,
        } as MaintenanceMode
      }
    },
    enabled,
    refetchInterval: refetchIntervalMs,
    refetchOnWindowFocus: true,
    retry: 1,
    staleTime: 30_000,
  })
}
