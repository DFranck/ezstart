/**
 * RBAC Helpers - UI utilities for roles, permissions, and features
 */

import { type Role, getRBACConfig } from './types.js'

export type RoleColor = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger'

// Default labels for built-in roles
const DEFAULT_LABELS: Record<string, string> = {
  superadmin: 'Super Admin',
  admin: 'Admin',
  manager: 'Manager',
  'beta-tester': 'Beta Tester',
  client: 'Client',
}

// Default colors for built-in roles
const DEFAULT_COLORS: Record<string, RoleColor> = {
  superadmin: 'danger',
  admin: 'warning',
  manager: 'primary',
  'beta-tester': 'secondary',
  client: 'success',
}

// Default icons for built-in roles
const DEFAULT_ICONS: Record<string, string> = {
  superadmin: 'lucide:Crown',
  admin: 'lucide:Shield',
  manager: 'lucide:Users',
  'beta-tester': 'lucide:Flask',
  client: 'lucide:User',
}

// Default descriptions for built-in roles
const DEFAULT_DESCRIPTIONS: Record<string, string> = {
  superadmin: 'Full system access with all permissions',
  admin: 'Manage users, content, and settings',
  manager: 'View analytics and manage content',
  'beta-tester': 'Early access to beta features',
  client: 'Standard user access',
}

/**
 * Get display-friendly label for a role
 */
export function getRoleLabel(role: Role): string {
  return DEFAULT_LABELS[role] || role
}

/**
 * Get semantic color variant for a role (matches Badge/Chip variants)
 */
export function getRoleColor(role: Role): RoleColor {
  return DEFAULT_COLORS[role] || 'default'
}

/**
 * Get icon name for a role (using Iconify/Lucide)
 */
export function getRoleIcon(role: Role): string {
  return DEFAULT_ICONS[role] || 'lucide:User'
}

/**
 * Get description for a role
 */
export function getRoleDescription(role: Role): string {
  return DEFAULT_DESCRIPTIONS[role] || ''
}

/**
 * Sort roles by hierarchy (highest to lowest)
 * Uses the configurable hierarchy, unknown roles sort to the end.
 */
export function sortRolesByHierarchy(roles: Role[]): Role[] {
  const hierarchy = getRBACConfig().hierarchy
  return [...roles].sort((a, b) => {
    const levelA = hierarchy[a] ?? -1
    const levelB = hierarchy[b] ?? -1
    return levelB - levelA
  })
}

/**
 * Get highest role from a list of roles
 */
export function getHighestRole(roles: Role[]): Role | null {
  const sorted = sortRolesByHierarchy(roles)
  return sorted[0] || null
}
