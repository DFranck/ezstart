'use client'

import React, { type ReactNode, useEffect, useState } from 'react'
import { useAuth } from './hooks.js'

// ---------------------------------------------------------------------------
// RequireAuth
// ---------------------------------------------------------------------------

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
 * RequireAuth - Wrapper component that requires authentication.
 *
 * Shows loading state during hydration, then either:
 * - Renders children if authenticated
 * - Shows fallback/redirects if not authenticated
 */
export function RequireAuth({
  children,
  loadingComponent,
  fallbackComponent,
  redirectTo,
}: RequireAuthProps) {
  const { isAuthenticated } = useAuth()
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  if (!isHydrated) {
    return loadingComponent || null
  }

  if (!isAuthenticated && redirectTo) {
    if (typeof window !== 'undefined') {
      window.location.href = redirectTo
    }
    return null
  }

  if (!isAuthenticated) {
    return fallbackComponent || null
  }

  return <>{children}</>
}

// ---------------------------------------------------------------------------
// AccessDenied
// ---------------------------------------------------------------------------

export interface AccessDeniedProps {
  /** Title (optional, default: "Access Denied") */
  title?: string
  /** Message (optional, default: "You must be logged in to access this page.") */
  message?: string
  /** Additional content to show (optional) */
  children?: ReactNode
  /** Custom action button (optional) */
  actionButton?: ReactNode
}

/**
 * AccessDenied - Pre-styled message for authentication failures.
 *
 * Simple component that can be used with RequireAuth.
 */
export function AccessDenied({
  title = 'Access Denied',
  message = 'You must be logged in to access this page.',
  children,
  actionButton,
}: AccessDeniedProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-8">
      <h2 className="text-2xl font-bold">{title}</h2>
      <p className="text-muted-foreground text-center">{message}</p>
      {children}
      {actionButton}
    </div>
  )
}

// ---------------------------------------------------------------------------
// SignedIn / SignedOut
// ---------------------------------------------------------------------------

export interface SignedInProps {
  children: ReactNode
}

/**
 * Conditional wrapper that only renders children when the user is authenticated.
 */
export function SignedIn({ children }: SignedInProps) {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated) return null
  return <>{children}</>
}

export interface SignedOutProps {
  children: ReactNode
}

/**
 * Conditional wrapper that only renders children when the user is NOT authenticated.
 */
export function SignedOut({ children }: SignedOutProps) {
  const { isAuthenticated } = useAuth()
  if (isAuthenticated) return null
  return <>{children}</>
}
