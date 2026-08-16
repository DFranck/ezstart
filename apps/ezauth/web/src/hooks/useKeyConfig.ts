'use client'

import { useEffect, useState } from 'react'
import { apiCall, ApiError } from '@ezstart/api-sdk'

/**
 * State returned by `useKeyConfig`.
 *
 * - `idle` — no key provided (legacy ?app= mode)
 * - `loading` — key is being validated against the API
 * - `valid` — key is valid, `appName` is resolved
 * - `invalid` — key is invalid, revoked, or expired
 * - `rate_limited` — `/keys/config` returned 429; the hook will keep
 *   returning this status until an explicit retry succeeds or the caller
 *   triggers a re-fetch (changing `publishableKey` or unmounting).
 *   `retryAfter` (seconds) is populated when the server provided one.
 * - `error` — unexpected transport/server error (5xx, network); callers
 *   should present a generic "service temporarily unavailable" message.
 */
export interface KeyConfigState {
  status: 'idle' | 'loading' | 'valid' | 'invalid' | 'rate_limited' | 'error'
  /** Resolved app name from the key config, or undefined. */
  appName: string | undefined
  /**
   * Human-readable Application name resolved from the key config
   * (`Application.name` on the API side). Undefined when the key is not
   * bound to an Application (platform-wide admin keys) or when the API
   * hasn't returned it yet. Callers MUST fall back to a prettified
   * `appName` when missing.
   */
  appDisplayName: string | undefined
  /**
   * Key scope from the config endpoint:
   * - `'admin'` — platform-wide key (e.g. ezauth self-seed). Do NOT use
   *   `appName` for white-labeling; fall back to the caller's app hint.
   * - `'user' | 'readonly'` — per-tenant key; `appName` is authoritative.
   * - Legacy `'test' | 'live'` — backwards compat; treat as per-tenant.
   */
  scope: 'admin' | 'user' | 'readonly' | 'test' | 'live' | undefined
  /** HTTP status when the validation failed (0 for network errors). */
  httpStatus: number | undefined
  /** Raw error message surfaced by the API (english, for debug/toast). */
  errorMessage: string | undefined
  /** Seconds before a retry should be attempted (only set when rate-limited). */
  retryAfter: number | undefined
}

const IDLE_STATE: KeyConfigState = {
  status: 'idle',
  appName: undefined,
  appDisplayName: undefined,
  scope: undefined,
  httpStatus: undefined,
  errorMessage: undefined,
  retryAfter: undefined,
}

/**
 * Validates a publishable key from `?key=` URL param against
 * `GET /api/keys/config?key=xxx` and resolves the app name.
 *
 * Returns `{ status: 'idle', appName: undefined, ... }` when no key is
 * provided (legacy ?app= mode or first-party).
 *
 * Unlike the previous behavior, a rate-limit response (HTTP 429) maps to
 * `status: 'rate_limited'` (NOT `invalid`), so the UI can distinguish
 * between "retry shortly" and "this key will never work" and communicate
 * that clearly to the user.
 *
 * Pass a changing `retryNonce` (e.g. a counter) to force a re-fetch without
 * changing the publishable key itself — useful for manual retries after a
 * `rate_limited` or `error` state.
 */
export function useKeyConfig(
  publishableKey: string | undefined,
  retryNonce: number = 0
): KeyConfigState {
  const [state, setState] = useState<KeyConfigState>(() =>
    publishableKey ? { ...IDLE_STATE, status: 'loading' } : IDLE_STATE
  )

  useEffect(() => {
    if (!publishableKey) {
      setState(IDLE_STATE)
      return
    }

    let cancelled = false
    setState({ ...IDLE_STATE, status: 'loading' })

    apiCall<{
      appName: string
      appDisplayName?: string
      scope: KeyConfigState['scope']
    }>(`/keys/config?key=${encodeURIComponent(publishableKey)}`, {
      appName: 'ezauth',
      method: 'GET',
    })
      .then(data => {
        if (cancelled) return
        setState({
          status: 'valid',
          appName: data.appName,
          appDisplayName: data.appDisplayName,
          scope: data.scope,
          httpStatus: 200,
          errorMessage: undefined,
          retryAfter: undefined,
        })
      })
      .catch((err: unknown) => {
        if (cancelled) return
        const apiErr = ApiError.isApiError(err) ? err : undefined
        const httpStatus = apiErr?.status
        const errorMessage = apiErr?.message ?? (err instanceof Error ? err.message : undefined)

        if (httpStatus === 429) {
          setState({
            status: 'rate_limited',
            appName: undefined,
            appDisplayName: undefined,
            scope: undefined,
            httpStatus,
            errorMessage,
            retryAfter: apiErr?.retryAfter,
          })
          return
        }

        // Treat 5xx / network as transient error (service unavailable)
        if (httpStatus === 0 || (httpStatus !== undefined && httpStatus >= 500)) {
          setState({
            status: 'error',
            appName: undefined,
            appDisplayName: undefined,
            scope: undefined,
            httpStatus,
            errorMessage,
            retryAfter: undefined,
          })
          return
        }

        // 4xx (401, 403, 404) → key is definitively invalid/revoked/expired
        setState({
          status: 'invalid',
          appName: undefined,
          appDisplayName: undefined,
          scope: undefined,
          httpStatus,
          errorMessage,
          retryAfter: undefined,
        })
      })

    return () => {
      cancelled = true
    }
  }, [publishableKey, retryNonce])

  return state
}
