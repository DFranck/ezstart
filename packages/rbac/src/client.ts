/**
 * Client-side RBAC utilities
 * For use in React components (Next.js, etc.)
 */

import type { AuthUser } from '@ezstart/auth-sdk'
import { ROLE_HIERARCHY, ROLE_PERMISSIONS, ROLE_FEATURES, type Role, type Permission, type Feature } from './types'

/**
 * Check if user has a specific role
 */
export function hasRole(user: AuthUser | null, role: Role): boolean {
  console.log('[RBAC] hasRole check:', {
    hasUser: !!user,
    roles: user?.roles,
    isArray: Array.isArray(user?.roles),
    checkingRole: role
  })
  if (!user?.roles || !Array.isArray(user.roles)) return false
  return user.roles.includes(role)
}

/**
 * Check if user has ANY of the specified roles
 */
export function hasAnyRole(user: AuthUser | null, roles: Role[]): boolean {
  if (!user?.roles || !Array.isArray(user.roles)) return false
  return roles.some(role => user.roles!.includes(role))
}

/**
 * Check if user has ALL of the specified roles
 */
export function hasAllRoles(user: AuthUser | null, roles: Role[]): boolean {
  if (!user?.roles || !Array.isArray(user.roles)) return false
  return roles.every(role => user.roles!.includes(role))
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
    return user.roles.some(role => {
      const rolePerms = ROLE_PERMISSIONS[role as Role]
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
    return user.roles.some(role => {
      const roleFeatures = ROLE_FEATURES[role as Role]
      return roleFeatures?.includes(feature)
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
 * - Superadmin can manage everyone
 * - Admin can manage users in their apps
 * - Manager can manage users they created (managedBy)
 */
export function canManageUser(currentUser: AuthUser | null, targetUser: AuthUser): boolean {
  if (!currentUser) return false

  // Superadmin can manage everyone
  if (hasRole(currentUser, 'superadmin')) return true

  // Admin can manage non-superadmins in their apps
  if (hasRole(currentUser, 'admin')) {
    if (hasRole(targetUser, 'superadmin')) return false
    // Check if they share at least one app
    return currentUser.apps?.some(app => targetUser.apps?.includes(app)) || false
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
  console.log('[RBAC] getHighestRoleLevel:', {
    hasUser: !!user,
    roles: user?.roles,
    rolesType: typeof user?.roles,
    isArray: Array.isArray(user?.roles),
    length: (user?.roles as any)?.length
  })
  if (!user?.roles || !Array.isArray(user.roles) || user.roles.length === 0) return 0

  return Math.max(
    ...user.roles.map(role => ROLE_HIERARCHY[role as Role] || 0)
  )
}

/**
 * Check if user's role is higher than another role
 */
export function isRoleHigherThan(user: AuthUser | null, role: Role): boolean {
  const userLevel = getHighestRoleLevel(user)
  const targetLevel = ROLE_HIERARCHY[role]
  return userLevel > targetLevel
}

/**
 * React hook for RBAC (works with @ezstart/auth-sdk)
 */
export function useRBAC(user: AuthUser | null) {
  return {
    hasRole: (role: Role) => hasRole(user, role),
    hasAnyRole: (roles: Role[]) => hasAnyRole(user, roles),
    hasAllRoles: (roles: Role[]) => hasAllRoles(user, roles),
    hasPermission: (permission: Permission) => hasPermission(user, permission),
    hasAnyPermission: (permissions: Permission[]) => hasAnyPermission(user, permissions),
    hasAllPermissions: (permissions: Permission[]) => hasAllPermissions(user, permissions),
    hasFeature: (feature: Feature) => hasFeature(user, feature),
    hasAnyFeature: (features: Feature[]) => hasAnyFeature(user, features),
    canManageUser: (targetUser: AuthUser) => canManageUser(user, targetUser),
    isRoleHigherThan: (role: Role) => isRoleHigherThan(user, role),
    roleLevel: getHighestRoleLevel(user),
  }
}
