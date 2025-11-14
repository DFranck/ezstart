/**
 * RBAC Types for @ezstart monorepo
 * Role-Based Access Control system with hierarchical roles
 */

export type Role = 'superadmin' | 'admin' | 'manager' | 'beta-tester' | 'client'

export type Permission =
  // User Management
  | 'users:view'
  | 'users:manage'
  | 'users:delete'
  // Theme
  | 'theme:edit'
  | 'theme:publish'
  // Analytics
  | 'analytics:view'
  | 'analytics:export'
  // Content
  | 'content:create'
  | 'content:edit'
  | 'content:delete'
  | 'content:publish'
  // Organization
  | 'org:manage'
  | 'org:view-members'
  // Apps
  | 'apps:manage'
  // Custom permissions (extendable)
  | string

export type Feature =
  | 'beta-features'
  | 'early-access'
  | 'advanced-analytics'
  | 'custom-themes'
  | 'api-access'
  | string

/**
 * Role hierarchy - Higher roles inherit permissions from lower roles
 */
export const ROLE_HIERARCHY: Record<Role, number> = {
  superadmin: 100,
  admin: 80,
  manager: 60,
  'beta-tester': 40,
  client: 20,
}

/**
 * Default permissions per role
 */
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  superadmin: [
    // All permissions
    'users:view',
    'users:manage',
    'users:delete',
    'theme:edit',
    'theme:publish',
    'analytics:view',
    'analytics:export',
    'content:create',
    'content:edit',
    'content:delete',
    'content:publish',
    'org:manage',
    'org:view-members',
    'apps:manage',
  ],
  admin: [
    'users:view',
    'users:manage',
    'theme:edit',
    'analytics:view',
    'content:create',
    'content:edit',
    'content:publish',
    'org:view-members',
  ],
  manager: [
    'users:view',
    'analytics:view',
    'content:create',
    'content:edit',
    'org:view-members',
  ],
  'beta-tester': [
    'content:create',
  ],
  client: [],
}

/**
 * Default features per role
 */
export const ROLE_FEATURES: Record<Role, Feature[]> = {
  superadmin: [
    'beta-features',
    'early-access',
    'advanced-analytics',
    'custom-themes',
    'api-access',
  ],
  admin: [
    'advanced-analytics',
    'custom-themes',
    'api-access',
  ],
  manager: [
    'advanced-analytics',
  ],
  'beta-tester': [
    'beta-features',
    'early-access',
  ],
  client: [],
}
