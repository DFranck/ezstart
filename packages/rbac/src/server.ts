/**
 * Server-side RBAC utilities
 * For use in API routes and middleware
 */

import type { Request, Response, NextFunction } from 'express'
import type { Permission, Role, Feature } from './types.js'
import { matchesPermission, getRBACConfig } from './types.js'
import { hasRole } from './client.js'
import type { AuthUser } from '@ezstart/auth-sdk/server'

// Re-export types and helpers for server use
export * from './types.js'
export * from './helpers.js'

/**
 * Express middleware to require authentication
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Authentication required' })
  }
  next()
}

/**
 * Express middleware to require specific role(s)
 * Checks both globalRoles and appRoles
 *
 * @param role - The role required
 * @param appName - Optional app name for app-specific role checking
 */
export function requireRole(role: Role, appName?: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required' })
    }

    if (!hasRole(req.user as unknown as AuthUser, role, appName)) {
      return res.status(403).json({ success: false, error: 'Insufficient role' })
    }

    next()
  }
}

/**
 * Express middleware to require ANY of the specified roles
 * Checks both globalRoles and appRoles
 */
export function requireAnyRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required' })
    }

    const user = req.user!

    // Check globalRoles (e.g., superadmin)
    const globalRoles = user.globalRoles || []
    if (roles.some(role => globalRoles.includes(role))) {
      return next()
    }

    // Check appRoles for current app (if available)
    const appRoles = user.appRoles || {}
    const allAppRoles = Object.values(appRoles).flat()
    if (roles.some(role => allAppRoles.includes(role))) {
      return next()
    }

    return res.status(403).json({
      success: false,
      error: 'Insufficient role',
      required: roles,
    })
  }
}

/**
 * Express middleware to require a specific permission.
 * Resolves permissions from global roles, app roles, and explicit user permissions.
 * Supports wildcards: "*", "domain.*"
 *
 * @param permission - The permission required (e.g. "payments.refund")
 * @param appName - Optional app name for app-specific permission resolution
 */
export function requirePermission(permission: Permission, appName?: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required' })
    }

    const user = req.user!
    const config = getRBACConfig()

    // Superadmin has all permissions
    if (user.globalRoles?.includes('superadmin')) {
      return next()
    }

    // Check explicit user permissions (with wildcard support)
    if (user.permissions?.length && matchesPermission(user.permissions, permission)) {
      return next()
    }

    // Check global role permissions
    for (const role of user.globalRoles || []) {
      const perms = config.globalPermissions[role] || []
      if (matchesPermission(perms, permission)) return next()
    }

    // Check app-specific role permissions
    if (appName) {
      const appConfig = config.apps[appName]
      if (appConfig) {
        const appRoles = user.appRoles?.[appName] || []
        for (const role of appRoles) {
          const perms = appConfig.roles[role] || []
          if (matchesPermission(perms, permission)) return next()
        }
      }
    }

    // Check all app roles when no specific appName
    if (!appName && user.appRoles) {
      for (const [app, roles] of Object.entries(user.appRoles)) {
        const appConfig = config.apps[app]
        if (!appConfig) continue
        for (const role of roles) {
          const perms = appConfig.roles[role] || []
          if (matchesPermission(perms, permission)) return next()
        }
      }
    }

    return res.status(403).json({
      success: false,
      error: 'Insufficient permissions',
      required: permission,
    })
  }
}

/**
 * Express middleware to require specific feature(s)
 */
export function requireFeature(...features: Feature[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required' })
    }

    const user = req.user!

    // Superadmin has all features (check globalRoles)
    if (user.globalRoles?.includes('superadmin')) {
      return next()
    }

    const userFeatures = user.features || []
    const hasFeature = features.some(feat => userFeatures.includes(feat))

    if (!hasFeature) {
      return res.status(403).json({
        success: false,
        error: 'Feature not enabled',
        required: features,
      })
    }

    next()
  }
}

/**
 * Check if authenticated user can manage target user
 */
export function canManageUser(req: Request, targetUserId: string): boolean {
  if (!req.user) return false

  const user = req.user!

  // Superadmin can manage everyone (check globalRoles)
  if (user.globalRoles?.includes('superadmin')) {
    return true
  }

  // Admin can manage users in their organization (check appRoles)
  const appRoles = user.appRoles || {}
  const allRoles = Object.values(appRoles).flat()
  if (allRoles.includes('admin')) {
    return true
  }

  // Manager can manage users they created
  if (allRoles.includes('manager')) {
    return user._id === targetUserId
  }

  return false
}
