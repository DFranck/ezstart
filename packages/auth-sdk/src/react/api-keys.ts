'use client'

/**
 * React Query hooks for API key management.
 *
 * Peer dependencies: `@tanstack/react-query`, `@ezstart/api-sdk`.
 */

import { apiCall } from '@ezstart/api-sdk'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  ApiKeyItem,
  ApiKeyUsageResponse,
  CreateApiKeyRequest,
  CreateApiKeyResponse,
} from '../core/types.js'

/** Query key constants for cache invalidation. */
const API_KEYS_KEY = ['api-keys'] as const
const apiKeyUsageKey = (keyId: string) => ['api-key-usage', keyId] as const

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/** Options for {@link useApiKeys}. */
export interface UseApiKeysOptions {
  /**
   * Pre-resolved API keys (from a server-side fetch via
   * `getServerApiKeys()`). When provided, React Query seeds the cache so the
   * first paint of `<DeveloperPortal>` already shows the table — no client
   * `<Spinner>` flash. The hook still revalidates in the background to keep
   * the data fresh.
   */
  initialData?: ApiKeyItem[]
}

/**
 * Fetch the current user's API keys.
 *
 * @example
 * ```tsx
 * const { data, isLoading } = useApiKeys(!!user)
 * ```
 *
 * SSR companion: pass server-side pre-fetched keys to skip the initial
 * loading state.
 *
 * @example
 * ```tsx
 * const { data } = useApiKeys(true, { initialData: serverKeys })
 * ```
 */
export function useApiKeys(enabled = true, options?: UseApiKeysOptions) {
  return useQuery({
    queryKey: API_KEYS_KEY,
    queryFn: () =>
      apiCall<ApiKeyItem[]>('/keys', {
        appName: 'ezauth',
        method: 'GET',
      }),
    enabled,
    initialData: options?.initialData,
  })
}

/**
 * Fetch usage stats for a specific API key.
 *
 * @example
 * ```tsx
 * const { data } = useApiKeyUsage('key-id-123', true)
 * ```
 */
export function useApiKeyUsage(keyId: string | null, enabled = true) {
  return useQuery({
    queryKey: apiKeyUsageKey(keyId ?? ''),
    queryFn: () =>
      apiCall<ApiKeyUsageResponse>(`/keys/${keyId}/usage`, {
        appName: 'ezauth',
        method: 'GET',
      }),
    enabled: !!keyId && enabled,
  })
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

interface MutationCallbacks<T = void> {
  onSuccess?: (data: T) => void
  onError?: (error: Error) => void
}

/**
 * Mutation to create a new API key.
 *
 * @example
 * ```tsx
 * const create = useCreateApiKey({ onSuccess: (data) => setKey(data.key) })
 * create.mutate({ name: 'My Key', appName: '*', expiresAt: null })
 * ```
 */
export function useCreateApiKey(callbacks?: MutationCallbacks<CreateApiKeyResponse>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateApiKeyRequest) =>
      apiCall<CreateApiKeyResponse>('/keys', {
        appName: 'ezauth',
        method: 'POST',
        body,
      }),
    onSuccess: data => {
      queryClient.invalidateQueries({ queryKey: [...API_KEYS_KEY] })
      callbacks?.onSuccess?.(data)
    },
    onError: (error: Error) => {
      callbacks?.onError?.(error)
    },
  })
}

/**
 * Mutation to revoke an API key.
 *
 * @example
 * ```tsx
 * const revoke = useRevokeApiKey({ onSuccess: () => toast.success('Revoked') })
 * revoke.mutate('key-id-123')
 * ```
 */
export function useRevokeApiKey(callbacks?: MutationCallbacks) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiCall(`/keys/${id}`, {
        appName: 'ezauth',
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...API_KEYS_KEY] })
      callbacks?.onSuccess?.()
    },
    onError: (error: Error) => {
      callbacks?.onError?.(error)
    },
  })
}

/**
 * Mutation to rotate an API key (revoke + create new).
 *
 * @example
 * ```tsx
 * const rotate = useRotateApiKey({ onSuccess: (data) => setKey(data.key) })
 * rotate.mutate('key-id-123')
 * ```
 */
export function useRotateApiKey(callbacks?: MutationCallbacks<CreateApiKeyResponse>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiCall<CreateApiKeyResponse>(`/keys/${id}/rotate`, {
        appName: 'ezauth',
        method: 'POST',
      }),
    onSuccess: data => {
      queryClient.invalidateQueries({ queryKey: [...API_KEYS_KEY] })
      callbacks?.onSuccess?.(data)
    },
    onError: (error: Error) => {
      callbacks?.onError?.(error)
    },
  })
}
