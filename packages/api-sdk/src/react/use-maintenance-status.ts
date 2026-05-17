'use client'

/**
 * Public maintenance status hook — platform-wide, no auth required.
 *
 * Polls a `/maintenance-status`-style endpoint so consumer apps can render
 * a banner (or any other surface) whenever a platform-level maintenance
 * window is active. Originally lived in `@ezstart/auth-sdk` — moved here
 * because maintenance status is a platform-wide concern, not auth-specific.
 *
 * Resilient by design: if the API is unreachable or returns an error, the
 * hook silently degrades (no thrown error visible to consumers, no retry
 * storm) so the banner stays hidden and the app keeps functioning.
 *
 * Peer dependencies: `@tanstack/react-query`, `react`.
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { ApiError } from '../core/api-error.js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Platform-wide maintenance status returned by the public
 * `/maintenance-status` endpoint.
 *
 * Mirrors the shape historically exposed by `@ezstart/auth-sdk`'s
 * `MaintenanceMode` (public projection — admin-only fields stripped).
 */
export interface MaintenanceStatus {
  /** Whether maintenance mode is currently active. */
  enabled: boolean
  /** Banner message displayed to users (may be empty). */
  message: string
  /** ISO datetime when maintenance was enabled, or null if disabled. */
  startedAt: string | null
  /** Optional ISO datetime when maintenance is expected to end. */
  scheduledEnd: string | null
}

export interface UseMaintenanceStatusOptions {
  /**
   * Base URL of the API exposing `/maintenance-status` (e.g.
   * `https://api.example.com`). The hook appends the configured `path`
   * (default `/api/maintenance-status`) and never reads from `@ezstart/config`,
   * so this hook stays usable in any project, monorepo or external.
   */
  apiUrl: string
  /**
   * Endpoint path appended to `apiUrl`. Defaults to `/api/maintenance-status`.
   * Override only if your API exposes the status under a different path.
   */
  path?: string
  /** Polling interval in ms. Defaults to `60_000` (1 minute). */
  refetchIntervalMs?: number
  /** React Query enabled flag. Defaults to `true`. */
  enabled?: boolean
}

const DEFAULT_PATH = '/api/maintenance-status'
const QUERY_KEY = ['public', 'maintenance-status'] as const

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Fetch platform-wide maintenance status (no auth required).
 *
 * @example
 * ```tsx
 * import { useMaintenanceStatus } from '@ezstart/api-sdk/react'
 * import { MaintenanceBanner } from '@ezstart/ui/components'
 *
 * function PlatformShell({ children }) {
 *   const { data } = useMaintenanceStatus({
 *     apiUrl: 'https://api.example.com',
 *   })
 *   return (
 *     <>
 *       <MaintenanceBanner status={data ?? null} sticky />
 *       {children}
 *     </>
 *   )
 * }
 * ```
 */
export function useMaintenanceStatus(
  options: UseMaintenanceStatusOptions
): UseQueryResult<MaintenanceStatus, ApiError> {
  const { apiUrl, path = DEFAULT_PATH, refetchIntervalMs = 60_000, enabled = true } = options

  // Build the full URL once per call — strip a trailing slash on `apiUrl`
  // so consumers can pass either form.
  const url = `${apiUrl.replace(/\/+$/, '')}${path.startsWith('/') ? path : `/${path}`}`

  return useQuery<MaintenanceStatus, ApiError>({
    queryKey: [...QUERY_KEY, url],
    queryFn: async ({ signal }) => {
      try {
        // MED-1: propagate the React Query–provided AbortSignal so the
        // fetch is cancelled when the query is invalidated, the component
        // unmounts, or a refetch supersedes the in-flight call.
        const res = await fetch(url, {
          method: 'GET',
          headers: { Accept: 'application/json' },
          credentials: 'include',
          signal,
        })
        if (!res.ok) {
          return defaultDisabled()
        }
        const text = await res.text()
        if (text.length === 0) return defaultDisabled()
        let parsed: unknown
        try {
          parsed = JSON.parse(text)
        } catch {
          return defaultDisabled()
        }
        return normalizeStatus(parsed)
      } catch (err) {
        // CRITICAL: do NOT swallow AbortError as "no maintenance" — let
        // React Query observe the cancellation so the query is properly
        // marked as aborted (otherwise a unmount/remount flashes a
        // "banner hidden" state from the synthetic defaultDisabled() result
        // before the real fetch resolves).
        if (err instanceof Error && err.name === 'AbortError') throw err
        // Public banner must never break the consumer app — silently
        // degrade to "no maintenance" on any other network/parse failure.
        return defaultDisabled()
      }
    },
    enabled,
    refetchInterval: refetchIntervalMs,
    refetchOnWindowFocus: true,
    retry: 1,
    staleTime: 30_000,
  })
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function defaultDisabled(): MaintenanceStatus {
  return {
    enabled: false,
    message: '',
    startedAt: null,
    scheduledEnd: null,
  }
}

/**
 * Normalize whatever the API returned into the `MaintenanceStatus` shape.
 *
 * Accepts either the bare `MaintenanceStatus` object or an `ApiResponse`
 * envelope (`{ success: true, data: MaintenanceStatus }`). Falls back to
 * "no maintenance" on any unexpected shape so a misconfigured server never
 * breaks the consumer banner.
 */
function normalizeStatus(parsed: unknown): MaintenanceStatus {
  if (!parsed || typeof parsed !== 'object') return defaultDisabled()
  const root = parsed as Record<string, unknown>
  // Unwrap envelope when present.
  const candidate =
    root.data && typeof root.data === 'object' ? (root.data as Record<string, unknown>) : root

  return {
    enabled: typeof candidate.enabled === 'boolean' ? candidate.enabled : false,
    message: typeof candidate.message === 'string' ? candidate.message : '',
    startedAt: typeof candidate.startedAt === 'string' ? candidate.startedAt : null,
    scheduledEnd: typeof candidate.scheduledEnd === 'string' ? candidate.scheduledEnd : null,
  }
}
