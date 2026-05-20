'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePayContext } from '../pay-provider.js'
import type { Plan } from '../../core/types.js'

interface UsePlansParams {
  /**
   * @deprecated Use `applicationId` instead. Forwarded to the backend only when
   * `applicationId` is absent (legacy fallback).
   */
  appName?: string
  /** Preferred scope — takes precedence over `appName`. */
  applicationId?: string
  active?: boolean
  limit?: number
  offset?: number
  autoLoad?: boolean
  /**
   * SSR-resolved plans used to hydrate the hook synchronously at mount.
   *
   * Pass the result of `getServerPlans()` (from `@ezstart/pay-sdk/server`) so
   * `<PricingPage>` renders the cards on the very first paint — the
   * `useEffect` fetch then becomes a revalidation-only fallback rather than
   * the primary source (no skeleton flash). When provided, `isLoading` starts
   * `false`.
   */
  initialPlans?: Plan[]
}

export function usePlans(params: UsePlansParams = {}) {
  const { client, applicationId: ctxApplicationId, appSlug: ctxAppSlug } = usePayContext()

  const {
    appName: appNameProp,
    applicationId: applicationIdProp,
    active = true,
    limit = 50,
    offset = 0,
    autoLoad = true,
    initialPlans,
  } = params

  const hasInitialPlans = initialPlans !== undefined
  // Hydrate synchronously from the SSR snapshot when provided so the first
  // render is correct (no skeleton flash). `isLoading` only starts `true`
  // when there is no SSR data AND we will auto-load.
  const [plans, setPlans] = useState<Plan[]>(initialPlans ?? [])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Resolution order: explicit applicationId > explicit appName > context applicationId > context appSlug
  const effectiveApplicationId = applicationIdProp ?? ctxApplicationId ?? undefined
  const effectiveAppName =
    appNameProp ?? (effectiveApplicationId ? undefined : (ctxAppSlug ?? undefined))

  // Tracks whether we've already revalidated against the server at least
  // once. The first revalidation after an SSR hydrate runs SILENTLY (no
  // `isLoading` flash) so `<PricingPage>` keeps showing the SSR cards instead
  // of swapping to the skeleton.
  const revalidatedRef = useRef(false)

  const loadPlans = useCallback(
    async (opts?: { silent?: boolean }) => {
      const silent = opts?.silent ?? false
      if (!silent) setIsLoading(true)
      setError(null)
      try {
        const result = await client.listPlans({
          applicationId: effectiveApplicationId,
          appName: effectiveAppName,
          active,
          limit,
          offset,
        })
        const sortedPlans = (result.data || []).sort((a, b) => a.sortOrder - b.sortOrder)
        setPlans(sortedPlans)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load plans')
      } finally {
        if (!silent) setIsLoading(false)
      }
    },
    [client, effectiveApplicationId, effectiveAppName, active, limit, offset]
  )

  useEffect(() => {
    if (!autoLoad) return
    // SSR hydrate present + first revalidation → run silently (no skeleton).
    const silent = hasInitialPlans && !revalidatedRef.current
    revalidatedRef.current = true
    void loadPlans({ silent })
  }, [autoLoad, loadPlans, hasInitialPlans])

  // Stable no-arg reload — discards any event/args a caller (e.g. onClick)
  // might forward so it always triggers a visible (non-silent) reload.
  const reload = useCallback(() => {
    void loadPlans()
  }, [loadPlans])

  return {
    plans,
    isLoading,
    error,
    reload,
  }
}
