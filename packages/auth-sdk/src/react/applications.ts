'use client'

/**
 * React Query hooks for Application management (P6 — multi-tenant entity).
 *
 * Peer dependencies: `@tanstack/react-query`, `@ezstart/api-sdk`.
 *
 * @module @ezstart/auth-sdk/react/applications
 */

import { apiCall } from '@ezstart/api-sdk'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  Application,
  ApplicationResolveResponse,
  CreateApplicationRequest,
  UpdateApplicationRequest,
  UpdateApplicationThemeRequest,
} from '../core/types.js'

/** Query keys for cache invalidation. */
const APPLICATIONS_KEY = ['applications'] as const
const applicationKey = (id: string) => ['applications', id] as const
const applicationResolveKey = (key: string) => ['applications', 'resolve', key] as const

interface UseMyApplicationsOptions {
  /** If `true`, superadmin-only flag `?all=true` is sent. */
  all?: boolean
  /** Include archived applications. */
  includeArchived?: boolean
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Fetch applications owned by the current user (or all, if superadmin + `all=true`).
 *
 * @example
 * ```tsx
 * const { data, isLoading } = useMyApplications(true)
 * ```
 */
export function useMyApplications(enabled = true, options: UseMyApplicationsOptions = {}) {
  const { all = false, includeArchived = false } = options
  const search = new URLSearchParams()
  if (all) search.set('all', 'true')
  if (includeArchived) search.set('includeArchived', 'true')
  const qs = search.toString()
  const path = qs ? `/applications?${qs}` : '/applications'

  return useQuery({
    queryKey: [...APPLICATIONS_KEY, { all, includeArchived }] as const,
    queryFn: () =>
      apiCall<Application[]>(path, {
        appName: 'ezauth',
        method: 'GET',
      }),
    enabled,
  })
}

/**
 * Fetch a single application by id.
 *
 * @example
 * ```tsx
 * const { data } = useApplication('app_123')
 * ```
 */
export function useApplication(id: string | null | undefined, enabled = true) {
  return useQuery({
    queryKey: applicationKey(id ?? ''),
    queryFn: () =>
      apiCall<Application>(`/applications/${id}`, {
        appName: 'ezauth',
        method: 'GET',
      }),
    enabled: !!id && enabled,
  })
}

/**
 * Resolve an Application from a raw publishable key.
 * Useful client-side to display the owning application for a given key.
 *
 * @example
 * ```tsx
 * const { data } = useResolveApplicationByKey('ez_pk_live_...')
 * ```
 */
export function useResolveApplicationByKey(
  publishableKey: string | null | undefined,
  enabled = true
) {
  return useQuery({
    queryKey: applicationResolveKey(publishableKey ?? ''),
    queryFn: () => {
      const params = new URLSearchParams({ key: publishableKey ?? '' })
      return apiCall<ApplicationResolveResponse>(`/applications/resolve?${params.toString()}`, {
        appName: 'ezauth',
        method: 'GET',
      })
    },
    enabled: !!publishableKey && enabled,
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
 * Mutation to create a new Application.
 *
 * @example
 * ```tsx
 * const create = useCreateApplication({ onSuccess: (app) => router.push(`/developer/${app.id}`) })
 * create.mutate({ slug: 'acme', name: 'Acme Corp' })
 * ```
 */
export function useCreateApplication(callbacks?: MutationCallbacks<Application>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateApplicationRequest) =>
      apiCall<Application>('/applications', {
        appName: 'ezauth',
        method: 'POST',
        body,
      }),
    onSuccess: data => {
      queryClient.invalidateQueries({ queryKey: [...APPLICATIONS_KEY] })
      callbacks?.onSuccess?.(data)
    },
    onError: (error: Error) => {
      callbacks?.onError?.(error)
    },
  })
}

interface UpdateApplicationInput {
  id: string
  data: UpdateApplicationRequest
}

/**
 * Mutation to update an existing Application (name / description / metadata).
 * Slug is immutable after creation.
 *
 * @example
 * ```tsx
 * const update = useUpdateApplication({ onSuccess: () => toast.success('Updated') })
 * update.mutate({ id: 'app_123', data: { name: 'Acme v2' } })
 * ```
 */
export function useUpdateApplication(callbacks?: MutationCallbacks<Application>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: UpdateApplicationInput) =>
      apiCall<Application>(`/applications/${id}`, {
        appName: 'ezauth',
        method: 'PATCH',
        body: data,
      }),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: [...APPLICATIONS_KEY] })
      queryClient.invalidateQueries({ queryKey: applicationKey(variables.id) })
      callbacks?.onSuccess?.(data)
    },
    onError: (error: Error) => {
      callbacks?.onError?.(error)
    },
  })
}

interface UpdateApplicationThemeInput {
  id: string
  data: UpdateApplicationThemeRequest
}

/**
 * Mutation to update an Application's white-label theme tokens and/or the
 * `themeEnabled` flag. Server validates every color string against a strict
 * allow-list (hex / oklch / hsl / rgb) and rejects anything that could
 * inject CSS.
 *
 * @example
 * ```tsx
 * const update = useUpdateApplicationTheme({ onSuccess: () => toast.success('Theme saved') })
 * update.mutate({ id: 'app_123', data: { theme: { primary: '#00D9F7' }, themeEnabled: true } })
 * ```
 */
export function useUpdateApplicationTheme(callbacks?: MutationCallbacks<Application>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: UpdateApplicationThemeInput) =>
      apiCall<Application>(`/applications/${id}/theme`, {
        appName: 'ezauth',
        method: 'PATCH',
        body: data,
      }),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: [...APPLICATIONS_KEY] })
      queryClient.invalidateQueries({ queryKey: applicationKey(variables.id) })
      callbacks?.onSuccess?.(data)
    },
    onError: (error: Error) => {
      callbacks?.onError?.(error)
    },
  })
}

/**
 * Mutation to archive (soft-delete) an Application.
 * Blocks if the app still has active keys unless `cascade=true` is passed.
 *
 * @example
 * ```tsx
 * const revoke = useRevokeApplication({ onSuccess: () => toast.success('Archived') })
 * revoke.mutate({ id: 'app_123' })
 * ```
 */
export function useRevokeApplication(callbacks?: MutationCallbacks) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, cascade = false }: { id: string; cascade?: boolean }) => {
      const qs = cascade ? '?cascade=true' : ''
      return apiCall(`/applications/${id}${qs}`, {
        appName: 'ezauth',
        method: 'DELETE',
      })
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [...APPLICATIONS_KEY] })
      queryClient.invalidateQueries({ queryKey: applicationKey(variables.id) })
      callbacks?.onSuccess?.()
    },
    onError: (error: Error) => {
      callbacks?.onError?.(error)
    },
  })
}
