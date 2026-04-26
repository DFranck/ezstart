'use client'

/**
 * React Query hooks for admin feature flag management.
 *
 * Peer dependencies: `@tanstack/react-query`, `@ezstart/api-sdk`.
 */

import { apiCall } from '@ezstart/api-sdk'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { FeatureFlag, UpdateFeatureFlagRequest } from '../core/types.js'

/** Stable query key for the feature-flags list cache. */
const FEATURE_FLAGS_KEY = ['admin', 'feature-flags'] as const

interface AdminFetchOptions {
  /** Override the EZAuth API base URL (federated admin embeds). */
  apiUrl?: string
  /** Override the bearer token used by the request. */
  authToken?: string | (() => string | Promise<string>)
}

interface MutationCallbacks<T = void> {
  onSuccess?: (data: T) => void
  onError?: (error: Error) => void
}

async function resolveToken(
  authToken: AdminFetchOptions['authToken']
): Promise<string | null | undefined> {
  if (authToken === undefined) return undefined
  if (typeof authToken === 'function') {
    const value = await authToken()
    return value || null
  }
  return authToken || null
}

function buildGetTokenOption(authToken: AdminFetchOptions['authToken']): {
  getToken?: () => Promise<string | null>
} {
  if (authToken === undefined) return {}
  return {
    getToken: async () => {
      const value = await resolveToken(authToken)
      return value ?? null
    },
  }
}

/**
 * Fetch every feature flag known to the platform.
 *
 * @example
 * ```tsx
 * const { data, isLoading } = useFeatureFlags()
 * ```
 */
export function useFeatureFlags(options: AdminFetchOptions & { enabled?: boolean } = {}) {
  const { enabled = true, apiUrl, authToken } = options
  return useQuery({
    queryKey: FEATURE_FLAGS_KEY,
    queryFn: () =>
      apiCall<FeatureFlag[]>('/admin/feature-flags', {
        appName: 'ezauth',
        method: 'GET',
        ...(apiUrl ? { baseUrl: apiUrl } : {}),
        ...buildGetTokenOption(authToken),
      }),
    enabled,
  })
}

/**
 * Mutation to toggle / upsert a feature flag.
 *
 * @example
 * ```tsx
 * const update = useUpdateFeatureFlag()
 * update.mutate({ key: 'billing.new-checkout', body: { enabled: true } })
 * ```
 */
export function useUpdateFeatureFlag(
  callbacks?: MutationCallbacks<FeatureFlag> & AdminFetchOptions
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ key, body }: { key: string; body: UpdateFeatureFlagRequest }) =>
      apiCall<FeatureFlag>(`/admin/feature-flags/${encodeURIComponent(key)}`, {
        appName: 'ezauth',
        method: 'PATCH',
        body,
        ...(callbacks?.apiUrl ? { baseUrl: callbacks.apiUrl } : {}),
        ...buildGetTokenOption(callbacks?.authToken),
      }),
    onSuccess: data => {
      queryClient.invalidateQueries({ queryKey: [...FEATURE_FLAGS_KEY] })
      callbacks?.onSuccess?.(data)
    },
    onError: (error: Error) => {
      callbacks?.onError?.(error)
    },
  })
}
