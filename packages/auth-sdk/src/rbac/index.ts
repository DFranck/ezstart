/**
 * RBAC - Role-Based Access Control
 *
 * Universal exports (client + React components)
 *
 * Architecture: Role -> gives Permissions -> checked by hasPermission()
 * Supports wildcards: "*" (all), "domain.*" (all actions in domain)
 */

export * from './types.js'
export * from './client.js'
export * from './helpers.js'

// React Components - Explicit exports to avoid loading React in Node.js context
export { RoleBadge, RoleBadgeList } from './components/role-badge.js'
export type { RoleBadgeProps, RoleBadgeListProps } from './components/role-badge.js'
export { RequireRole } from './components/require-role.js'
export type { RequireRoleProps } from './components/require-role.js'
export { InsufficientPermissions } from './components/insufficient-permissions.js'
export type { InsufficientPermissionsProps } from './components/insufficient-permissions.js'
