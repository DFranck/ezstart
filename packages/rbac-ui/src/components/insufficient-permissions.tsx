'use client'

import React, { type ReactNode } from 'react'
import { type Role } from '@ezstart/rbac'
import { getRoleLabel } from '@ezstart/rbac'

export interface InsufficientPermissionsProps {
  /** Required role(s) that user is missing */
  requiredRoles: Role | Role[]
  /** Title (optional, default: "Access Denied") */
  title?: string
  /** Message (optional) */
  message?: string
  /** Additional content to show (optional) */
  children?: ReactNode
  /** Show required roles badge (optional, default: true) */
  showRequiredRoles?: boolean
}

/**
 * InsufficientPermissions - Pre-styled message for RBAC failures
 *
 * Simple, unstyled component that can be used with RequireRole.
 * You can wrap this with your own UI components (Card, Section, etc.)
 *
 * @example
 * ```tsx
 * <RequireRole
 *   roles="superadmin"
 *   fallbackComponent={<InsufficientPermissions requiredRoles="superadmin" />}
 * >
 *   <AdminPanel />
 * </RequireRole>
 * ```
 */
export function InsufficientPermissions({
  requiredRoles,
  title = 'Access Denied',
  message = "You don't have permission to access this resource.",
  children,
  showRequiredRoles = true,
}: InsufficientPermissionsProps) {
  const roleArray = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles]
  const roleLabels = roleArray.map(getRoleLabel).join(', ')

  return (
    <div className="flex flex-col items-center justify-center gap-4 p-8">
      <h2 className="text-2xl font-bold">{title}</h2>
      <p className="text-muted-foreground text-center">{message}</p>
      {showRequiredRoles && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Required role(s):</span>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-destructive/10 text-destructive">
            {roleLabels}
          </span>
        </div>
      )}
      {children}
    </div>
  )
}
