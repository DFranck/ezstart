'use client'

/**
 * React Query hooks for OAuth provider management.
 *
 * Wraps `GET /api/auth/me/oauth-providers` and
 * `DELETE /api/auth/me/oauth-providers/:provider` so consumers can list and
 * disconnect linked OAuth accounts (Google, GitHub, …) without rewriting
 * the fetch boilerplate per app.
 *
 * Peer dependencies: `@tanstack/react-query`, `@ezstart/api-sdk`.
 */

import { apiCall } from '@ezstart/api-sdk'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ConnectedOAuthProvider } from '../core/types.js'

/** Query key constants for cache invalidation. */
const OAUTH_PROVIDERS_KEY = ['oauth-providers'] as const

interface MutationCallbacks<T = void> {
  onSuccess?: (data: T) => void
  onError?: (error: Error) => void
}

/**
 * Fetch the OAuth providers connected to the current user.
 *
 * The endpoint requires authentication — the hook is typically gated on the
 * `enabled` flag (e.g. `!!user`) so it does not fire for signed-out visitors.
 *
 * @example
 * ```tsx
 * const { data: providers, isLoading } = useOAuthProviders(!!user)
 * ```
 */
export function useOAuthProviders(enabled = true) {
  return useQuery({
    queryKey: OAUTH_PROVIDERS_KEY,
    queryFn: () =>
      apiCall<{ providers: ConnectedOAuthProvider[] }>('/auth/me/oauth-providers', {
        appName: 'ezauth',
        method: 'GET',
      }).then(r => r.providers),
    enabled,
  })
}

/**
 * Disconnect (unlink) an OAuth provider from the current user.
 *
 * On success the providers list is invalidated automatically. On HTTP 409
 * (last login method) the underlying `apiCall` rejects with a parsed error
 * so consumers can render a friendly toast.
 *
 * @example
 * ```tsx
 * const disconnect = useDisconnectOAuthProvider({
 *   onSuccess: () => toast.success('Disconnected'),
 *   onError: (err) => toast.error(err.message),
 * })
 * disconnect.mutate('google')
 * ```
 */
export function useDisconnectOAuthProvider(callbacks?: MutationCallbacks) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (provider: string) =>
      apiCall(`/auth/me/oauth-providers/${encodeURIComponent(provider)}`, {
        appName: 'ezauth',
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...OAUTH_PROVIDERS_KEY] })
      callbacks?.onSuccess?.()
    },
    onError: (error: Error) => {
      callbacks?.onError?.(error)
    },
  })
}
