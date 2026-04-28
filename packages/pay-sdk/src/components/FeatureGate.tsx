'use client'

import type { ReactNode } from 'react'
import { useSubscriptionStatus } from '../react/hooks/useSubscriptionStatus.js'
import { usePayLogger } from '../react/pay-provider.js'

interface FeatureGateProps {
  /** The feature name to check against the plan's features list */
  feature: string
  /** User ID to check subscription for */
  userId?: string
  /**
   * @deprecated Use `applicationId` instead. Kept for backward compatibility.
   */
  appName?: string
  /** Ezauth Application id (preferred). Falls back to context when absent. */
  applicationId?: string
  /** Fallback content when feature is not available */
  fallback?: ReactNode
  /** Content to render when the user has access to the feature */
  children: ReactNode
}

export function FeatureGate({
  feature,
  userId,
  appName,
  applicationId,
  fallback,
  children,
}: FeatureGateProps) {
  const log = usePayLogger()

  // Surface deprecation warning when consumer passes the legacy `appName` prop.
  if (appName && !applicationId && typeof window !== 'undefined') {
    log.warn('[pay-sdk] FeatureGate `appName` prop is deprecated, use `applicationId` instead.')
  }

  const { loading, features } = useSubscriptionStatus({ userId, appName, applicationId })

  if (loading) return null
  if (!features.includes(feature)) return fallback ? <>{fallback}</> : null

  return <>{children}</>
}

export type { FeatureGateProps }
