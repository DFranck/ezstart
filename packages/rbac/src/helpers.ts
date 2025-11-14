/**
 * RBAC Helpers - UI utilities for roles, permissions, and features
 */

import { Role } from './types.js'

export type RoleColor = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger'

/**
 * Get display-friendly label for a role
 */
export function getRoleLabel(role: Role): string {
  const labels: Record<Role, string> = {
    superadmin: 'Super Admin',
    admin: 'Admin',
    manager: 'Manager',
    'beta-tester': 'Beta Tester',
    client: 'Client',
  }
  return labels[role] || role
}

/**
 * Get semantic color variant for a role (matches Badge/Chip variants)
 */
export function getRoleColor(role: Role): RoleColor {
  const colors: Record<Role, RoleColor> = {
    superadmin: 'danger',    // Red - highest privilege
    admin: 'warning',        // Orange/Yellow - high privilege
    manager: 'primary',      // Blue - medium privilege
    'beta-tester': 'secondary', // Purple/Gray - special access
    client: 'success',       // Green - standard user
  }
  return colors[role] || 'default'
}

/**
 * Get icon name for a role (using Iconify/Lucide)
 */
export function getRoleIcon(role: Role): string {
  const icons: Record<Role, string> = {
    superadmin: 'lucide:Crown',
    admin: 'lucide:Shield',
    manager: 'lucide:Users',
    'beta-tester': 'lucide:Flask',
    client: 'lucide:User',
  }
  return icons[role] || 'lucide:User'
}

/**
 * Get description for a role
 */
export function getRoleDescription(role: Role): string {
  const descriptions: Record<Role, string> = {
    superadmin: 'Full system access with all permissions',
    admin: 'Manage users, content, and settings',
    manager: 'View analytics and manage content',
    'beta-tester': 'Early access to beta features',
    client: 'Standard user access',
  }
  return descriptions[role] || ''
}

/**
 * Sort roles by hierarchy (highest to lowest)
 */
export function sortRolesByHierarchy(roles: Role[]): Role[] {
  const hierarchy: Role[] = ['superadmin', 'admin', 'manager', 'beta-tester', 'client']
  return [...roles].sort((a, b) => {
    return hierarchy.indexOf(a) - hierarchy.indexOf(b)
  })
}

/**
 * Get highest role from a list of roles
 */
export function getHighestRole(roles: Role[]): Role | null {
  const sorted = sortRolesByHierarchy(roles)
  return sorted[0] || null
}
