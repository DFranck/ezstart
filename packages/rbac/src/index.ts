/**
 * @ezstart/rbac - Role-Based Access Control
 *
 * Universal exports (client + server + React components)
 * Like @ezstart/auth-sdk, this package contains both logic and UI
 */

export * from './types'
export * from './client'
export * from './helpers'

// React Components - Explicit exports to avoid loading React in Node.js context
export { RoleBadge, RoleBadgeList } from './components/role-badge'
export type { RoleBadgeProps, RoleBadgeListProps } from './components/role-badge'
export { RequireRole } from './components/require-role'
export type { RequireRoleProps } from './components/require-role'
export { InsufficientPermissions } from './components/insufficient-permissions'
export type { InsufficientPermissionsProps } from './components/insufficient-permissions'
