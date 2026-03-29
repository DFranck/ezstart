/**
 * Client-side RBAC utilities
 * For use in React components (Next.js, etc.)
 */

import type { AuthUser } from '@ezstart/auth-sdk/server'
import { getRBACConfig, type Role, type Permission, type Feature } from './types.js'

/**
 * Check if user has a specific role
 * @param user - The user to check
 * @param role - The role to check for
 * @param appName - Optional app name for app-specific role checking
 */
export function hasRole(user: AuthUser | null, role: Role, appName?: string): boolean {
  if (!user) return false

  // Superadmin is always global and has access to everything
  if (role === 'superadmin') {
    return user.globalRoles?.includes('superadmin') || user.roles?.includes('superadmin') || false
  }

  // If appName specified, check app-specific role
  if (appName) {
    const appRoles = user.appRoles?.[appName]
    if (appRoles?.includes(role)) return true
  }

  // Check new globalRoles
  if (user.globalRoles?.includes(role)) return true

  // Check if user has role in ANY app (when appName not specified)
  if (!appName && user.appRoles) {
    const hasInAnyApp = Object.values(user.appRoles).some(roles => roles.includes(role))
    if (hasInAnyApp) return true
  }

  // Check old roles field for backwards compatibility
  if (user.roles?.includes(role)) return true

  return false
}

/**
 * Check if user has ANY of the specified roles
 * @param user - The user to check
 * @param roles - Array of roles to check
 * @param appName - Optional app name for app-specific role checking
 */
export function hasAnyRole(user: AuthUser | null, roles: Role[], appName?: string): boolean {
  if (!user) return false

  // Superadmin always returns true
  if (hasRole(user, 'superadmin', appName)) return true

  return roles.some(role => hasRole(user, role, appName))
}

/**
 * Check if user has ALL of the specified roles
 * @param user - The user to check
 * @param roles - Array of roles to check
 * @param appName - Optional app name for app-specific role checking
 */
export function hasAllRoles(user: AuthUser | null, roles: Role[], appName?: string): boolean {
  if (!user) return false
  return roles.every(role => hasRole(user, role, appName))
}

/**
 * Check if user has a specific permission
 * Superadmin automatically has all permissions
 */
export function hasPermission(user: AuthUser | null, permission: Permission): boolean {
  if (!user) return false

  // Superadmin has everything
  if (hasRole(user, 'superadmin')) return true

  // Check explicit permissions
  if (user.permissions?.includes(permission)) return true

  // Check role-based permissions
  if (user.roles) {
    const { permissions: rolePermissions } = getRBACConfig()
    return user.roles.some(role => {
      const rolePerms = rolePermissions[role]
      return rolePerms?.includes(permission)
    })
  }

  return false
}

/**
 * Check if user has ANY of the specified permissions
 */
export function hasAnyPermission(user: AuthUser | null, permissions: Permission[]): boolean {
  return permissions.some(perm => hasPermission(user, perm))
}

/**
 * Check if user has ALL of the specified permissions
 */
export function hasAllPermissions(user: AuthUser | null, permissions: Permission[]): boolean {
  return permissions.every(perm => hasPermission(user, perm))
}

/**
 * Check if user has access to a specific feature
 * Superadmin automatically has all features
 */
export function hasFeature(user: AuthUser | null, feature: Feature): boolean {
  if (!user) return false

  // Superadmin has everything
  if (hasRole(user, 'superadmin')) return true

  // Check explicit features
  if (user.features?.includes(feature)) return true

  // Check role-based features
  if (user.roles) {
    const { features: roleFeatures } = getRBACConfig()
    return user.roles.some(role => {
      const feats = roleFeatures[role]
      return feats?.includes(feature)
    })
  }

  return false
}

/**
 * Check if user has ANY of the specified features
 */
export function hasAnyFeature(user: AuthUser | null, features: Feature[]): boolean {
  return features.some(feat => hasFeature(user, feat))
}

/**
 * Check if user can manage another user
 * Rules:
 * - Superadmin can manage everyone everywhere
 * - Admin can manage users ONLY in apps where they have admin role
 * - Manager can manage users they created (managedBy)
 */
export function canManageUser(
  currentUser: AuthUser | null,
  targetUser: AuthUser,
  appName?: string
): boolean {
  if (!currentUser) return false

  // Superadmin can manage everyone everywhere
  if (hasRole(currentUser, 'superadmin')) return true

  // Admin can manage non-superadmins ONLY in apps where they have admin role
  if (appName && hasRole(currentUser, 'admin', appName)) {
    if (hasRole(targetUser, 'superadmin')) return false
    // Can only manage users in THIS app
    return targetUser.apps?.includes(appName) || false
  }

  // Legacy admin check (no appName specified) - check if they share ANY app where current user is admin
  if (!appName && hasRole(currentUser, 'admin')) {
    if (hasRole(targetUser, 'superadmin')) return false

    // Check if current user is admin in any of the target user's apps
    const currentUserAppRoles = currentUser.appRoles || {}
    const sharedApps = currentUser.apps?.filter(app => targetUser.apps?.includes(app)) || []

    return sharedApps.some(app => {
      const roles = currentUserAppRoles[app] || []
      return roles.includes('admin')
    })
  }

  // Manager can manage users they created
  if (hasRole(currentUser, 'manager')) {
    return targetUser.managedBy === currentUser._id
  }

  return false
}

/**
 * Get user's highest role level
 */
export function getHighestRoleLevel(user: AuthUser | null): number {
  if (!user?.roles || !Array.isArray(user.roles) || user.roles.length === 0) return 0

  const { hierarchy } = getRBACConfig()
  return Math.max(...user.roles.map(role => hierarchy[role] || 0))
}

/**
 * Check if user's role is higher than another role
 */
export function isRoleHigherThan(user: AuthUser | null, role: Role): boolean {
  const userLevel = getHighestRoleLevel(user)
  const { hierarchy } = getRBACConfig()
  const targetLevel = hierarchy[role] ?? 0
  return userLevel > targetLevel
}

/**
 * React hook for RBAC (works with @ezstart/auth-sdk)
 * @param user - The authenticated user
 * @param appName - Optional app name for app-specific role checking
 */
export function useRBAC(user: AuthUser | null, appName?: string) {
  return {
    hasRole: (role: Role, overrideAppName?: string) =>
      hasRole(user, role, overrideAppName || appName),
    hasAnyRole: (roles: Role[], overrideAppName?: string) =>
      hasAnyRole(user, roles, overrideAppName || appName),
    hasAllRoles: (roles: Role[], overrideAppName?: string) =>
      hasAllRoles(user, roles, overrideAppName || appName),
    hasPermission: (permission: Permission) => hasPermission(user, permission),
    hasAnyPermission: (permissions: Permission[]) => hasAnyPermission(user, permissions),
    hasAllPermissions: (permissions: Permission[]) => hasAllPermissions(user, permissions),
    hasFeature: (feature: Feature) => hasFeature(user, feature),
    hasAnyFeature: (features: Feature[]) => hasAnyFeature(user, features),
    canManageUser: (targetUser: AuthUser, overrideAppName?: string) =>
      canManageUser(user, targetUser, overrideAppName || appName),
    isRoleHigherThan: (role: Role) => isRoleHigherThan(user, role),
    roleLevel: getHighestRoleLevel(user),
    appName, // Expose current app name
  }
}
