/**
 * RBAC Types for @ezstart monorepo
 * Role-Based Access Control system with hierarchical roles and granular permissions
 *
 * Architecture: Role -> gives Permissions -> checked by hasPermission()
 * Supports wildcards: "*" (all), "domain.*" (all actions in domain)
 *
 * Uses a configurable registry pattern: defaults are provided but can be extended
 * via configureRBAC() or extendRBACConfig() without code changes.
 */

// --- Default roles ---
export const DEFAULT_ROLES = ['superadmin', 'admin', 'manager', 'beta-tester', 'client'] as const
export type DefaultRole = (typeof DEFAULT_ROLES)[number]

// Allows any string but preserves autocomplete for known roles
export type Role = DefaultRole | (string & {})

// Granular permission format: "domain.action" (e.g. "payments.refund")
export type Permission = string

export type Feature =
  | 'beta-features'
  | 'early-access'
  | 'advanced-analytics'
  | 'custom-themes'
  | 'api-access'
  | (string & {})

/**
 * Default role hierarchy - Higher roles inherit permissions from lower roles
 */
export const DEFAULT_ROLE_HIERARCHY: Record<string, number> = {
  superadmin: 100,
  admin: 90,
  manager: 70,
  editor: 50,
  viewer: 30,
  'beta-tester': 25,
  user: 10,
  client: 10,
}

/**
 * Default permissions per role (legacy format, kept for backward compatibility)
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<string, Permission[]> = {
  superadmin: ['*'],
  admin: [
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
  manager: ['users:view', 'analytics:view', 'content:create', 'content:edit', 'org:view-members'],
  'beta-tester': ['content:create'],
  client: [],
}

/**
 * Default features per role
 */
export const DEFAULT_ROLE_FEATURES: Record<string, Feature[]> = {
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

// --- App-level RBAC config ---

/**
 * RBAC config for a single app
 */
export interface AppRBACConfig {
  roles: Record<string, Permission[]> // role -> permissions
}

/**
 * Full RBAC configuration with hierarchy, global permissions, and per-app configs
 */
export interface RBACConfig {
  hierarchy: Record<string, number> // role -> level (superadmin=100, admin=90, etc.)
  globalPermissions: Record<string, Permission[]> // globalRole -> permissions
  apps: Record<string, AppRBACConfig> // appName -> config
  // Legacy fields (backward compatibility)
  permissions: Record<string, Permission[]>
  features: Record<string, Feature[]>
}

/**
 * Default per-app RBAC configurations
 */
const DEFAULT_APP_CONFIGS: Record<string, AppRBACConfig> = {
  ezpay: {
    roles: {
      admin: ['payments.*', 'subscriptions.*', 'donations.*', 'refund', 'products.*'],
      editor: ['payments.read', 'subscriptions.read', 'donations.read', 'products.edit'],
      viewer: ['payments.read', 'donations.read'],
    },
  },
  ezstart: {
    roles: {
      admin: ['users.*', 'content.*', 'monitoring.*', 'settings.*'],
      editor: ['content.edit', 'content.create', 'monitoring.read'],
      viewer: ['content.read', 'monitoring.read'],
    },
  },
  ezbill: {
    roles: {
      admin: ['invoices.*', 'clients.*', 'settings.*'],
      editor: ['invoices.create', 'invoices.edit', 'clients.read'],
      viewer: ['invoices.read', 'clients.read'],
    },
  },
  'green-pulse': {
    roles: {
      admin: ['forms.*', 'submissions.*', 'ai.*', 'settings.*'],
      editor: ['forms.edit', 'submissions.read', 'ai.generate'],
      viewer: ['forms.read', 'submissions.read'],
    },
  },
  fengshui: {
    roles: {
      admin: ['analysis.*', 'reports.*', 'settings.*'],
      editor: ['analysis.create', 'reports.read'],
      viewer: ['analysis.read', 'reports.read'],
    },
  },
  'gacha-analyzer': {
    roles: {
      admin: ['scans.*', 'settings.*'],
      editor: ['scans.create', 'scans.read'],
      viewer: ['scans.read'],
    },
  },
}

/**
 * Default global permissions (cross-app)
 */
const DEFAULT_GLOBAL_PERMISSIONS: Record<string, Permission[]> = {
  superadmin: ['*'],
  admin: ['users.*', 'monitoring.*', 'payments.read'],
}

// --- Configurable registry ---

let _roleConfig: RBACConfig = {
  hierarchy: { ...DEFAULT_ROLE_HIERARCHY },
  globalPermissions: { ...DEFAULT_GLOBAL_PERMISSIONS },
  apps: structuredClone(DEFAULT_APP_CONFIGS),
  permissions: { ...DEFAULT_ROLE_PERMISSIONS },
  features: { ...DEFAULT_ROLE_FEATURES },
}

/**
 * Configure RBAC with custom roles, permissions, and features.
 * Merges with existing defaults -- pass only what you want to override or extend.
 *
 * @example
 * ```ts
 * configureRBAC({
 *   hierarchy: { ...DEFAULT_ROLE_HIERARCHY, 'content-editor': 50 },
 *   permissions: { ...DEFAULT_ROLE_PERMISSIONS, 'content-editor': ['content:create', 'content:edit'] },
 * })
 * ```
 */
export function configureRBAC(config: Partial<RBACConfig>) {
  _roleConfig = {
    hierarchy: config.hierarchy
      ? { ..._roleConfig.hierarchy, ...config.hierarchy }
      : _roleConfig.hierarchy,
    globalPermissions: config.globalPermissions
      ? { ..._roleConfig.globalPermissions, ...config.globalPermissions }
      : _roleConfig.globalPermissions,
    apps: config.apps ? { ..._roleConfig.apps, ...config.apps } : _roleConfig.apps,
    permissions: config.permissions
      ? { ..._roleConfig.permissions, ...config.permissions }
      : _roleConfig.permissions,
    features: config.features
      ? { ..._roleConfig.features, ...config.features }
      : _roleConfig.features,
  }
}

/**
 * Extend RBAC config for a specific app.
 * Allows apps to register their own role->permission mappings at startup.
 *
 * @example
 * ```ts
 * extendRBACConfig('myapp', {
 *   roles: {
 *     admin: ['myapp.*'],
 *     editor: ['myapp.edit'],
 *   }
 * })
 * ```
 */
export function extendRBACConfig(appName: string, config: AppRBACConfig) {
  _roleConfig.apps[appName] = config
}

/**
 * Get current RBAC configuration (read-only snapshot)
 */
export function getRBACConfig(): Readonly<RBACConfig> {
  return _roleConfig
}

/**
 * Wildcard permission matcher.
 * Supports:
 * - "*" matches everything
 * - "domain.*" matches "domain.action" (any action in domain)
 * - Exact match "domain.action" matches "domain.action"
 */
export function matchesPermission(permissions: Permission[], target: Permission): boolean {
  return permissions.some(p => {
    if (p === '*') return true
    if (p === target) return true
    if (p.endsWith('.*')) {
      const domain = p.slice(0, -2)
      return target.startsWith(domain + '.')
    }
    return false
  })
}

// --- Backward-compatible aliases ---
// These read from the live config so they reflect any configureRBAC() calls.

/** @deprecated Use getRBACConfig().hierarchy or DEFAULT_ROLE_HIERARCHY */
export const ROLE_HIERARCHY: Record<string, number> = new Proxy({} as Record<string, number>, {
  get: (_target, prop: string) => _roleConfig.hierarchy[prop],
  has: (_target, prop: string) => prop in _roleConfig.hierarchy,
  ownKeys: () => Object.keys(_roleConfig.hierarchy),
  getOwnPropertyDescriptor: (_target, prop: string) => {
    if (prop in _roleConfig.hierarchy) {
      return { configurable: true, enumerable: true, value: _roleConfig.hierarchy[prop] }
    }
    return undefined
  },
})

/** @deprecated Use getRBACConfig().permissions or DEFAULT_ROLE_PERMISSIONS */
export const ROLE_PERMISSIONS: Record<string, Permission[]> = new Proxy(
  {} as Record<string, Permission[]>,
  {
    get: (_target, prop: string) => _roleConfig.permissions[prop],
    has: (_target, prop: string) => prop in _roleConfig.permissions,
    ownKeys: () => Object.keys(_roleConfig.permissions),
    getOwnPropertyDescriptor: (_target, prop: string) => {
      if (prop in _roleConfig.permissions) {
        return { configurable: true, enumerable: true, value: _roleConfig.permissions[prop] }
      }
      return undefined
    },
  }
)

/** @deprecated Use getRBACConfig().features or DEFAULT_ROLE_FEATURES */
export const ROLE_FEATURES: Record<string, Feature[]> = new Proxy({} as Record<string, Feature[]>, {
  get: (_target, prop: string) => _roleConfig.features[prop],
  has: (_target, prop: string) => prop in _roleConfig.features,
  ownKeys: () => Object.keys(_roleConfig.features),
  getOwnPropertyDescriptor: (_target, prop: string) => {
    if (prop in _roleConfig.features) {
      return { configurable: true, enumerable: true, value: _roleConfig.features[prop] }
    }
    return undefined
  },
})
