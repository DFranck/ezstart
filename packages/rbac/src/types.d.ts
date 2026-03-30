/**
 * RBAC Types for @ezstart monorepo
 * Role-Based Access Control system with hierarchical roles
 *
 * Uses a configurable registry pattern: defaults are provided but can be extended
 * via configureRBAC() without code changes.
 */
export declare const DEFAULT_ROLES: readonly [
  'superadmin',
  'admin',
  'manager',
  'beta-tester',
  'client',
]
export type DefaultRole = (typeof DEFAULT_ROLES)[number]
export type Role = DefaultRole | (string & {})
export type Permission =
  | 'users:view'
  | 'users:manage'
  | 'users:delete'
  | 'theme:edit'
  | 'theme:publish'
  | 'analytics:view'
  | 'analytics:export'
  | 'content:create'
  | 'content:edit'
  | 'content:delete'
  | 'content:publish'
  | 'org:manage'
  | 'org:view-members'
  | 'apps:manage'
  | (string & {})
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
export declare const DEFAULT_ROLE_HIERARCHY: Record<string, number>
/**
 * Default permissions per role
 */
export declare const DEFAULT_ROLE_PERMISSIONS: Record<string, Permission[]>
/**
 * Default features per role
 */
export declare const DEFAULT_ROLE_FEATURES: Record<string, Feature[]>
interface RBACConfig {
  hierarchy: Record<string, number>
  permissions: Record<string, Permission[]>
  features: Record<string, Feature[]>
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
export declare function configureRBAC(config: Partial<RBACConfig>): void
/**
 * Get current RBAC configuration (read-only snapshot)
 */
export declare function getRBACConfig(): Readonly<RBACConfig>
/** @deprecated Use getRBACConfig().hierarchy or DEFAULT_ROLE_HIERARCHY */
export declare const ROLE_HIERARCHY: Record<string, number>
/** @deprecated Use getRBACConfig().permissions or DEFAULT_ROLE_PERMISSIONS */
export declare const ROLE_PERMISSIONS: Record<string, Permission[]>
/** @deprecated Use getRBACConfig().features or DEFAULT_ROLE_FEATURES */
export declare const ROLE_FEATURES: Record<string, Feature[]>
export {}
//# sourceMappingURL=types.d.ts.map
