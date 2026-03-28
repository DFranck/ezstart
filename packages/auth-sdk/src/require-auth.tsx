'use client'

import React, { type ReactNode, useEffect, useState } from 'react'
import { useAuth } from './provider'

export interface RequireAuthProps {
  /** Content to show when authenticated */
  children: ReactNode
  /** Custom loading component (optional) */
  loadingComponent?: ReactNode
  /** Custom fallback when not authenticated (optional) */
  fallbackComponent?: ReactNode
  /** Redirect URL instead of showing fallback (optional) */
  redirectTo?: string
}

/**
 * RequireAuth - Wrapper component that requires authentication
 *
 * Shows loading state during hydration, then either:
 * - Renders children if authenticated
 * - Shows fallback/redirects if not authenticated
 *
 * @example
 * ```tsx
 * <RequireAuth>
 *   <ProtectedContent />
 * </RequireAuth>
 *
 * <RequireAuth fallbackComponent={<LoginPrompt />}>
 *   <AdminPanel />
 * </RequireAuth>
 * ```
 */
export function RequireAuth({
  children,
  loadingComponent,
  fallbackComponent,
  redirectTo,
}: RequireAuthProps) {
  const { isAuthenticated } = useAuth()
  const [isHydrated, setIsHydrated] = useState(false)

  // Wait for client-side hydration
  useEffect(() => {
    setIsHydrated(true)
  }, [])

  // Show loading while hydrating
  if (!isHydrated) {
    return loadingComponent || null
  }

  // Redirect if specified
  if (!isAuthenticated && redirectTo) {
    if (typeof window !== 'undefined') {
      window.location.href = redirectTo
    }
    return null
  }

  // Show fallback or nothing if not authenticated
  if (!isAuthenticated) {
    return fallbackComponent || null
  }

  // Authenticated - show children
  return <>{children}</>
}
