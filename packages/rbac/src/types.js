/**
 * RBAC Types for @ezstart monorepo
 * Role-Based Access Control system with hierarchical roles
 *
 * Uses a configurable registry pattern: defaults are provided but can be extended
 * via configureRBAC() without code changes.
 */
// --- Default roles ---
export const DEFAULT_ROLES = ['superadmin', 'admin', 'manager', 'beta-tester', 'client']
/**
 * Default role hierarchy - Higher roles inherit permissions from lower roles
 */
export const DEFAULT_ROLE_HIERARCHY = {
  superadmin: 100,
  admin: 80,
  manager: 60,
  'beta-tester': 40,
  client: 20,
}
/**
 * Default permissions per role
 */
export const DEFAULT_ROLE_PERMISSIONS = {
  superadmin: [
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
  manager: ['users:view', 'analytics:view', 'content:create', 'content:edit', 'org:view-members'],
  'beta-tester': ['content:create'],
  client: [],
}
/**
 * Default features per role
 */
export const DEFAULT_ROLE_FEATURES = {
  superadmin: [
    'beta-features',
    'early-access',
    'advanced-analytics',
    'custom-themes',
    'api-access',
  ],
  admin: ['advanced-analytics', 'custom-themes', 'api-access'],
  manager: ['advanced-analytics'],
  'beta-tester': ['beta-features', 'early-access'],
  client: [],
}
let _roleConfig = {
  hierarchy: { ...DEFAULT_ROLE_HIERARCHY },
  permissions: { ...DEFAULT_ROLE_PERMISSIONS },
  features: { ...DEFAULT_ROLE_FEATURES },
}
/**
 * Configure RBAC with custom roles, permissions, and features.
 * Merges with existing defaults — pass only what you want to override or extend.
 *
 * @example
 * ```ts
 * configureRBAC({
 *   hierarchy: { ...DEFAULT_ROLE_HIERARCHY, 'content-editor': 50 },
 *   permissions: { ...DEFAULT_ROLE_PERMISSIONS, 'content-editor': ['content:create', 'content:edit'] },
 * })
 * ```
 */
export function configureRBAC(config) {
  _roleConfig = {
    hierarchy: config.hierarchy
      ? { ..._roleConfig.hierarchy, ...config.hierarchy }
      : _roleConfig.hierarchy,
    permissions: config.permissions
      ? { ..._roleConfig.permissions, ...config.permissions }
      : _roleConfig.permissions,
    features: config.features
      ? { ..._roleConfig.features, ...config.features }
      : _roleConfig.features,
  }
}
/**
 * Get current RBAC configuration (read-only snapshot)
 */
export function getRBACConfig() {
  return _roleConfig
}
// --- Backward-compatible aliases ---
// These read from the live config so they reflect any configureRBAC() calls.
/** @deprecated Use getRBACConfig().hierarchy or DEFAULT_ROLE_HIERARCHY */
export const ROLE_HIERARCHY = new Proxy(
  {},
  {
    get: (_target, prop) => _roleConfig.hierarchy[prop],
    has: (_target, prop) => prop in _roleConfig.hierarchy,
    ownKeys: () => Object.keys(_roleConfig.hierarchy),
    getOwnPropertyDescriptor: (_target, prop) => {
      if (prop in _roleConfig.hierarchy) {
        return { configurable: true, enumerable: true, value: _roleConfig.hierarchy[prop] }
      }
      return undefined
    },
  }
)
/** @deprecated Use getRBACConfig().permissions or DEFAULT_ROLE_PERMISSIONS */
export const ROLE_PERMISSIONS = new Proxy(
  {},
  {
    get: (_target, prop) => _roleConfig.permissions[prop],
    has: (_target, prop) => prop in _roleConfig.permissions,
    ownKeys: () => Object.keys(_roleConfig.permissions),
    getOwnPropertyDescriptor: (_target, prop) => {
      if (prop in _roleConfig.permissions) {
        return { configurable: true, enumerable: true, value: _roleConfig.permissions[prop] }
      }
      return undefined
    },
  }
)
/** @deprecated Use getRBACConfig().features or DEFAULT_ROLE_FEATURES */
export const ROLE_FEATURES = new Proxy(
  {},
  {
    get: (_target, prop) => _roleConfig.features[prop],
    has: (_target, prop) => prop in _roleConfig.features,
    ownKeys: () => Object.keys(_roleConfig.features),
    getOwnPropertyDescriptor: (_target, prop) => {
      if (prop in _roleConfig.features) {
        return { configurable: true, enumerable: true, value: _roleConfig.features[prop] }
      }
      return undefined
    },
  }
)
