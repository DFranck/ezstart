/**
 * Server-side RBAC utilities
 * For use in API routes and middleware
 */

import type { Request, Response, NextFunction } from 'express'
import type { Permission, Role, Feature } from './types.js'

// Re-export types and helpers for server use
export * from './types.js'
export * from './helpers.js'

/**
 * Express middleware to require authentication
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' })
  }
  next()
}

/**
 * Express middleware to require specific role(s)
 * Checks both globalRoles and appRoles
 */
export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' })
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

    // Fallback: check legacy roles
    const legacyRoles = user.roles || []
    if (roles.some(role => legacyRoles.includes(role))) {
      return next()
    }

    return res.status(403).json({
      error: 'Insufficient permissions',
      required: roles,
      current: { globalRoles, appRoles, legacyRoles },
    })
  }
}

/**
 * Express middleware to require specific permission(s)
 */
export function requirePermission(...permissions: Permission[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const user = req.user!

    // Superadmin has all permissions (check globalRoles)
    if (user.globalRoles?.includes('superadmin') || user.roles?.includes('superadmin')) {
      return next()
    }

    const userPermissions = user.permissions || []
    const hasPermission = permissions.some(perm => userPermissions.includes(perm))

    if (!hasPermission) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        required: permissions,
        current: userPermissions,
      })
    }

    next()
  }
}

/**
 * Express middleware to require specific feature(s)
 */
export function requireFeature(...features: Feature[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const user = req.user!

    // Superadmin has all features (check globalRoles)
    if (user.globalRoles?.includes('superadmin') || user.roles?.includes('superadmin')) {
      return next()
    }

    const userFeatures = user.features || []
    const hasFeature = features.some(feat => userFeatures.includes(feat))

    if (!hasFeature) {
      return res.status(403).json({
        error: 'Feature not enabled',
        required: features,
        current: userFeatures,
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
  if (user.globalRoles?.includes('superadmin') || user.roles?.includes('superadmin')) {
    return true
  }

  // Admin can manage users in their organization (check appRoles)
  const appRoles = user.appRoles || {}
  const allRoles = Object.values(appRoles).flat()
  if (allRoles.includes('admin') || user.roles?.includes('admin')) {
    // TODO: Add organization check when implemented
    return true
  }

  // Manager can manage users they created
  if (allRoles.includes('manager') || user.roles?.includes('manager')) {
    return user._id === targetUserId
  }

  return false
}
