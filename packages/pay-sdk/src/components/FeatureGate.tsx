'use client'

import type { ReactNode } from 'react'
import { useSubscriptionStatus } from '../react/hooks/useSubscriptionStatus.js'

interface FeatureGateProps {
  /** The feature name to check against the plan's features list */
  feature: string
  /** User ID to check subscription for */
  userId?: string
  /** App name to resolve plan features */
  appName: string
  /** Fallback content when feature is not available */
  fallback?: ReactNode
  /** Content to render when the user has access to the feature */
  children: ReactNode
}

export function FeatureGate({ feature, userId, appName, fallback, children }: FeatureGateProps) {
  const { loading, features } = useSubscriptionStatus({ userId, appName })

  if (loading) return null
  if (!features.includes(feature)) return fallback ? <>{fallback}</> : null

  return <>{children}</>
}

export type { FeatureGateProps }
