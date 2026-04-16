'use client'

import React, { type ReactNode } from 'react'
import { useEzstartAuth as useAuth } from '../../ezstart-auth.js'
import { useRBAC } from '../client.js'
import { type Role } from '../types.js'

export interface RequireRoleProps {
  /** Required role(s) - user must have at least one */
  roles: Role | Role[]
  /** Content to show when user has required role */
  children: ReactNode
  /** Custom fallback when user doesn't have role (optional) */
  fallbackComponent?: ReactNode
  /** Require ALL roles instead of ANY (optional, default: false) */
  requireAll?: boolean
  /** Optional app name for app-specific role checking */
  appName?: string
}

/**
 * RequireRole - Wrapper component that requires specific role(s)
 *
 * Checks if user has required role(s) and either:
 * - Renders children if authorized
 * - Shows fallback if not authorized
 *
 * @example
 * ```tsx
 * // Require superadmin role
 * <RequireRole roles="superadmin">
 *   <AdminPanel />
 * </RequireRole>
 *
 * // Require any of these roles
 * <RequireRole roles={['admin', 'manager']}>
 *   <UserManagement />
 * </RequireRole>
 *
 * // Require ALL specified roles
 * <RequireRole roles={['admin', 'manager']} requireAll>
 *   <AdvancedFeature />
 * </RequireRole>
 *
 * // Custom fallback
 * <RequireRole roles="beta-tester" fallbackComponent={<AccessDenied />}>
 *   <BetaFeature />
 * </RequireRole>
 * ```
 */
export function RequireRole({
  roles,
  children,
  fallbackComponent,
  requireAll = false,
  appName,
}: RequireRoleProps) {
  const { user } = useAuth()
  const rbac = useRBAC(user, appName)

  // Normalize roles to array
  const roleArray = Array.isArray(roles) ? roles : [roles]

  // Check authorization (appName is already passed to useRBAC)
  const isAuthorized = requireAll
    ? rbac.hasAllRoles(roleArray)
    : rbac.hasAnyRole(roleArray)

  // Show fallback or nothing if not authorized
  if (!isAuthorized) {
    return fallbackComponent || null
  }

  // Authorized - show children
  return <>{children}</>
}
