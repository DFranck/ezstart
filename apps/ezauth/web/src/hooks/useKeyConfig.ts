'use client'

import { useEffect, useState } from 'react'
import { apiCall } from '@ezstart/api-sdk'

/**
 * State returned by `useKeyConfig`.
 *
 * - `idle` — no key provided (legacy ?app= mode)
 * - `loading` — key is being validated against the API
 * - `valid` — key is valid, `appName` is resolved
 * - `invalid` — key is invalid, revoked, or expired
 */
export interface KeyConfigState {
  status: 'idle' | 'loading' | 'valid' | 'invalid'
  /** Resolved app name from the key config, or undefined. */
  appName: string | undefined
}

/**
 * Validates a publishable key from `?key=` URL param against
 * `GET /api/keys/config?key=xxx` and resolves the app name.
 *
 * Returns `{ status: 'idle', appName: undefined }` when no key is provided
 * (legacy ?app= mode or first-party).
 */
export function useKeyConfig(publishableKey: string | undefined): KeyConfigState {
  const [state, setState] = useState<KeyConfigState>(() => ({
    status: publishableKey ? 'loading' : 'idle',
    appName: undefined,
  }))

  useEffect(() => {
    if (!publishableKey) {
      setState({ status: 'idle', appName: undefined })
      return
    }

    let cancelled = false
    setState({ status: 'loading', appName: undefined })

    apiCall<{
      appName: string
      scope: string
    }>(`/keys/config?key=${encodeURIComponent(publishableKey)}`, {
      appName: 'ezauth',
      method: 'GET',
    })
      .then(data => {
        if (cancelled) return
        setState({ status: 'valid', appName: data.appName })
      })
      .catch(() => {
        if (cancelled) return
        setState({ status: 'invalid', appName: undefined })
      })

    return () => {
      cancelled = true
    }
  }, [publishableKey])

  return state
}
