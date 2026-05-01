'use client'

/**
 * React Query hooks for the platform maintenance-mode singleton.
 *
 * Peer dependencies: `@tanstack/react-query`, `@ezstart/api-sdk`.
 */

import { apiCall } from '@ezstart/api-sdk'
import { useMaintenanceStatus as useApiSdkMaintenanceStatus } from '@ezstart/api-sdk/react'
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
 * @deprecated Moved to `@ezstart/api-sdk/react` as `useMaintenanceStatus`.
 * Will be removed 2026-08-01. The public maintenance status is platform-wide
 * (not auth-specific) so it now lives next to other generic API hooks.
 *
 * Migration:
 *
 * ```tsx
 * // before
 * import { useMaintenanceStatus } from '@ezstart/auth-sdk'
 *
 * // after
 * import { useMaintenanceStatus } from '@ezstart/api-sdk/react'
 * ```
 *
 * Backward-compat shim: forwards to the new api-sdk hook and preserves the
 * legacy default behaviour (apiUrl optional → falls back to
 * `NEXT_PUBLIC_EZAUTH_API_URL` when the consumer omits it).
 */
export function useMaintenanceStatus(
  options: { apiUrl?: string; enabled?: boolean; refetchIntervalMs?: number } = {}
) {
  const fallbackApiUrl =
    typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_EZAUTH_API_URL : undefined
  const resolvedApiUrl = options.apiUrl ?? fallbackApiUrl ?? ''
  return useApiSdkMaintenanceStatus({
    apiUrl: resolvedApiUrl,
    enabled: (options.enabled ?? true) && resolvedApiUrl.length > 0,
    ...(options.refetchIntervalMs !== undefined
      ? { refetchIntervalMs: options.refetchIntervalMs }
      : {}),
  })
}
