/**
 * Internal shared types and constants for the AuthAdminDashboard split.
 *
 * @internal
 */

export interface AdminUser {
  _id: string
  email: string
  username: string
  globalRoles: string[]
  appRoles: Record<string, string[]>
  apps?: string[]
  lastActiveAt?: string | null
  createdAt: string
}

export interface UsersApiMeta {
  total: number
  limit: number
  offset: number
}

export interface AuthAdminDashboardTexts {
  // Stats
  totalUsers?: string
  online?: string
  superadmins?: string
  admins?: string
  withAppRoles?: string

  // Search
  searchPlaceholder?: string

  // Table columns
  columnEmail?: string
  columnUsername?: string
  columnRoles?: string
  columnLastActive?: string
  columnCreatedAt?: string
  columnApps?: string
  columnActions?: string

  // Actions
  edit?: string
  delete?: string
  noUsers?: string

  // Online/relative time
  onlineLabel?: string
  minutesAgo?: string
  hoursAgo?: string
  daysAgo?: string

  // Delete dialog
  confirmDeleteTitle?: string
  confirmDeleteDescription?: string
  cancel?: string
  confirm?: string
  deleteError?: string
  deleteSuccess?: string

  // Edit roles modal
  editRolesTitle?: string
  editRolesSubtitle?: string
  globalRolesLabel?: string
  appRolesLabel?: string
  noAppRoles?: string
  save?: string
  editError?: string
  editSuccess?: string

  // Role labels
  roleSuperadmin?: string
  roleAdmin?: string
  roleManager?: string
  roleBetaTester?: string
  roleClient?: string

  // Pagination
  previous?: string
  next?: string

  // App filter (platform/first-party scope)
  allApps?: string
  filterByApp?: string
}

/**
 * RBAC audience scope for the admin dashboard — controls which population of
 * users the table queries.
 *
 * - `'mine'`    — current user only (singleton).
 * - `'myApps'`  — users registered to Applications the current user owns.
 * - `'all'`     — all users across all tenants (requires `globalRoles: ['superadmin']`).
 */
export type AuthAdminAudienceScope = 'mine' | 'myApps' | 'all'

export const ADMIN_PAGE_SIZE = 20
const ONLINE_THRESHOLD_MS = 5 * 60 * 1000

export const ADMIN_GLOBAL_ROLES = ['superadmin', 'admin'] as const
export const ADMIN_APP_ROLES = ['admin', 'manager', 'beta-tester', 'client'] as const

export const DEFAULT_ADMIN_TEXTS: Required<AuthAdminDashboardTexts> = {
  totalUsers: 'Total users',
  online: 'Online',
  superadmins: 'Superadmins',
  admins: 'Admins',
  withAppRoles: 'With app roles',
  searchPlaceholder: 'Search by email or username...',
  columnEmail: 'Email',
  columnUsername: 'Username',
  columnRoles: 'Roles',
  columnLastActive: 'Last active',
  columnCreatedAt: 'Created',
  columnApps: 'Apps',
  columnActions: 'Actions',
  edit: 'Edit',
  delete: 'Delete',
  noUsers: 'No users found.',
  onlineLabel: 'Online',
  minutesAgo: '{count}m ago',
  hoursAgo: '{count}h ago',
  daysAgo: '{count}d ago',
  confirmDeleteTitle: 'Delete user',
  confirmDeleteDescription:
    'Are you sure you want to delete this user? This action cannot be undone.',
  cancel: 'Cancel',
  confirm: 'Confirm',
  deleteError: 'Failed to delete user.',
  deleteSuccess: 'User deleted successfully.',
  editRolesTitle: 'Edit roles',
  editRolesSubtitle: 'Edit roles for {email}',
  globalRolesLabel: 'Global roles',
  appRolesLabel: '{app} roles',
  noAppRoles: 'No app-specific roles assigned.',
  save: 'Save',
  editError: 'Failed to update roles.',
  editSuccess: 'Roles updated successfully.',
  roleSuperadmin: 'Superadmin',
  roleAdmin: 'Admin',
  roleManager: 'Manager',
  roleBetaTester: 'Beta tester',
  roleClient: 'Client',
  previous: 'Previous',
  next: 'Next',
  allApps: 'All apps',
  filterByApp: 'Filter by app',
}

export function formatAdminDate(dateStr: string): string {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(dateStr))
}

export function isAdminUserOnline(lastActiveAt?: string | null): boolean {
  if (!lastActiveAt) return false
  return Date.now() - new Date(lastActiveAt).getTime() < ONLINE_THRESHOLD_MS
}

export function getAdminRelativeTime(
  lastActiveAt: string | null | undefined,
  t: Required<AuthAdminDashboardTexts>
): string {
  if (!lastActiveAt) return '-'
  const diffMs = Date.now() - new Date(lastActiveAt).getTime()
  const diffMin = Math.floor(diffMs / 60_000)
  const diffHours = Math.floor(diffMs / 3_600_000)
  const diffDays = Math.floor(diffMs / 86_400_000)

  if (diffMin < 5) return t.onlineLabel
  if (diffMin < 60) return t.minutesAgo.replace('{count}', String(diffMin))
  if (diffHours < 24) return t.hoursAgo.replace('{count}', String(diffHours))
  return t.daysAgo.replace('{count}', String(diffDays))
}

export function getAdminRoleLabel(role: string, t: Required<AuthAdminDashboardTexts>): string {
  const map: Record<string, string> = {
    superadmin: t.roleSuperadmin,
    admin: t.roleAdmin,
    manager: t.roleManager,
    'beta-tester': t.roleBetaTester,
    client: t.roleClient,
  }
  return map[role] || role
}
