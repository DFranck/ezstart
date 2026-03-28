'use client'

import React, { type ReactNode } from 'react'

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
 * AccessDenied - Pre-styled message for authentication failures
 *
 * Simple, unstyled component that can be used with RequireAuth.
 * You can wrap this with your own UI components (Card, Section, etc.)
 *
 * @example
 * ```tsx
 * <RequireAuth fallbackComponent={<AccessDenied />}>
 *   <ProtectedContent />
 * </RequireAuth>
 *
 * // With custom message
 * <AccessDenied
 *   title="Premium Feature"
 *   message="This feature requires a premium account."
 * />
 * ```
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
