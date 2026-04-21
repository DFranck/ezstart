'use client'

import { useCallback, useEffect, useState } from 'react'
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
}

export function usePlans(params: UsePlansParams = {}) {
  const { client, applicationId: ctxApplicationId, appSlug: ctxAppSlug } = usePayContext()
  const [plans, setPlans] = useState<Plan[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    appName: appNameProp,
    applicationId: applicationIdProp,
    active = true,
    limit = 50,
    offset = 0,
    autoLoad = true,
  } = params

  // Resolution order: explicit applicationId > explicit appName > context applicationId > context appSlug
  const effectiveApplicationId = applicationIdProp ?? ctxApplicationId ?? undefined
  const effectiveAppName =
    appNameProp ?? (effectiveApplicationId ? undefined : (ctxAppSlug ?? undefined))

  const loadPlans = useCallback(async () => {
    setIsLoading(true)
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
      setIsLoading(false)
    }
  }, [client, effectiveApplicationId, effectiveAppName, active, limit, offset])

  useEffect(() => {
    if (autoLoad) {
      loadPlans()
    }
  }, [autoLoad, loadPlans])

  return {
    plans,
    isLoading,
    error,
    reload: loadPlans,
  }
}
