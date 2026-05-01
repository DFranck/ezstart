/**
 * Internal shared types and constants for the AuthAdminDashboard split.
 *
 * @internal
 */

export interface AdminUser {
  _id: string
  email: string
  username: string
  /** Optional profile fields — editable via `<EditUserModal>`. */
  firstName?: string
  lastName?: string
  /**
   * Avatar URL (read-only in admin context — users update their own avatar
   * from the dashboard account section).
   */
  avatar?: string
  /**
   * Email verification status. Editable by superadmin via the status section
   * of `<EditUserModal>` (force-verify override). Reset to false whenever
   * the email is changed via the same modal.
   */
  isVerified?: boolean
  /**
   * When true, the user MUST reset their password at the next login. Set by
   * an admin (e.g. after a suspected leak). Surface in the admin table /
   * modal as a status badge.
   */
  mustChangePassword?: boolean
  globalRoles: string[]
  appRoles: Record<string, string[]>
  apps?: string[]
  lastActiveAt?: string | null
  createdAt: string
  /**
   * Soft-deletion timestamp ISO string. When set, the account is locked and
   * pending hard-delete (purge). Surfaced in the admin table via a
   * `<Badge variant="warning">` indicating the scheduled deletion date.
   *
   * Acts as the inverse of `isActive` in the admin UI: deletedAt=null →
   * account is active; deletedAt set → account is deactivated (soft-deleted).
   */
  deletedAt?: string | null
  /**
   * Scheduled hard-delete (purge) timestamp ISO string. The cron worker that
   * permanently removes soft-deleted records reads this field.
   */
  scheduledHardDeleteAt?: string | null
}

export interface UsersApiMeta {
  total: number
  limit: number
  offset: number
}

export interface AuthUsersSectionTexts {
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

  // Edit user modal — Profile section
  /** Section header above firstName / lastName / email / avatar fields. */
  profileSectionTitle?: string
  /** Label for the firstName input. */
  firstNameLabel?: string
  /** Label for the lastName input. */
  lastNameLabel?: string
  /** Label for the email input. */
  emailLabel?: string
  /**
   * Inline help / warning shown beneath the email input. Should explain
   * that changing the email triggers a fresh verification link.
   */
  emailChangeHint?: string
  /** Toast / status message shown when email change triggers a verification email. */
  emailChangeVerificationSent?: string
  /** Section label above the read-only avatar display. */
  avatarLabel?: string
  /**
   * Help text displayed under the read-only avatar — should explain that
   * the user updates their own avatar from `/dashboard?section=account`.
   */
  avatarHelp?: string

  // Edit user modal — Roles section
  /** Section header above the global + per-app role checkboxes. */
  rolesSectionTitle?: string

  // Edit user modal — Status section
  /** Section header above the status toggles. */
  statusSectionTitle?: string
  /** Toggle label for the isVerified field. */
  isVerifiedLabel?: string
  /** Help text explaining the isVerified toggle (admin force-verify). */
  isVerifiedHelp?: string
  /** Toggle label for the isActive field (soft-delete inverse). */
  isActiveLabel?: string
  /** Help text explaining the isActive toggle (soft-delete grace period). */
  isActiveHelp?: string
  /** Toggle label for the mustChangePassword field. */
  mustChangePasswordLabel?: string
  /** Help text explaining the mustChangePassword toggle (next-login forced reset). */
  mustChangePasswordHelp?: string

  // Role labels
  roleSuperadmin?: string
  roleAdmin?: string
  roleManager?: string
  roleBetaTester?: string
  roleClient?: string

  // Pagination
  previous?: string
  next?: string
  /** "{count} row(s)" template. */
  rows?: string
  /** "Page {current} of {total}" template. */
  pageOf?: string

  // Soft-deletion (account lifecycle)
  /** Badge label shown on soft-deleted users. `{date}` placeholder = scheduled hard-delete date (locale-formatted). */
  softDeletedBadge?: string
  /** Tooltip displayed on hover of the soft-deletion badge — explains the grace period. */
  softDeletedTooltip?: string
  /** Restore action button label (currently disabled — backend endpoint pending). */
  restoreAction?: string
  /** Tooltip on the disabled restore button — informs the user the feature is upcoming. */
  restoreComingSoon?: string
}

export const ADMIN_PAGE_SIZE = 20
const ONLINE_THRESHOLD_MS = 5 * 60 * 1000

export const ADMIN_GLOBAL_ROLES = ['superadmin', 'admin'] as const
export const ADMIN_APP_ROLES = ['admin', 'manager', 'beta-tester', 'client'] as const

export const DEFAULT_USERS_TEXTS: Required<AuthUsersSectionTexts> = {
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
  editRolesTitle: 'Edit user',
  editRolesSubtitle: 'Edit details for {email}',
  globalRolesLabel: 'Global roles',
  appRolesLabel: '{app} roles',
  noAppRoles: 'No app-specific roles assigned.',
  save: 'Save',
  editError: 'Failed to update user.',
  editSuccess: 'User updated successfully.',
  // Edit user modal — Profile section
  profileSectionTitle: 'Profile',
  firstNameLabel: 'First name',
  lastNameLabel: 'Last name',
  emailLabel: 'Email',
  emailChangeHint:
    'If you change the email, the user will receive a verification link at the new address.',
  emailChangeVerificationSent: 'Verification email sent to the new address.',
  avatarLabel: 'Avatar',
  avatarHelp:
    "The user can update their own avatar from /dashboard?section=account. Admins can't upload avatars on a user's behalf.",
  // Edit user modal — Roles section
  rolesSectionTitle: 'Roles',
  // Edit user modal — Status section
  statusSectionTitle: 'Status',
  isVerifiedLabel: 'Email verified',
  isVerifiedHelp: 'Force-verify the email without making the user click a link.',
  isActiveLabel: 'Account active',
  isActiveHelp:
    'Disable to soft-delete the account. The user can be restored within 30 days; after that the record is permanently purged.',
  mustChangePasswordLabel: 'Must change password',
  mustChangePasswordHelp:
    'Force the user to reset their password at the next login (suspected leak / manual provisioning).',
  roleSuperadmin: 'Superadmin',
  roleAdmin: 'Admin',
  roleManager: 'Manager',
  roleBetaTester: 'Beta tester',
  roleClient: 'Client',
  previous: 'Previous',
  next: 'Next',
  rows: '{count} row(s)',
  pageOf: 'Page {current} of {total}',
  softDeletedBadge: 'Scheduled deletion: {date}',
  softDeletedTooltip:
    'This account is soft-deleted and will be permanently removed on the scheduled date.',
  restoreAction: 'Restore',
  restoreComingSoon: 'Coming soon — restore endpoint not available yet.',
}

export function formatAdminDate(dateStr: string, locale?: string): string {
  return new Intl.DateTimeFormat(locale ?? undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(dateStr))
}

/**
 * Short locale-aware date formatter (no time, no year) used in the
 * soft-delete badge — keeps the badge compact ("Suppression prévue le 12/05",
 * "Scheduled deletion: May 12"). Falls back to a sensible default when no
 * locale is provided.
 */
export function formatAdminShortDate(dateStr: string, locale?: string): string {
  return new Intl.DateTimeFormat(locale ?? undefined, {
    day: '2-digit',
    month: '2-digit',
  }).format(new Date(dateStr))
}

export function isAdminUserOnline(lastActiveAt?: string | null): boolean {
  if (!lastActiveAt) return false
  return Date.now() - new Date(lastActiveAt).getTime() < ONLINE_THRESHOLD_MS
}

export function getAdminRelativeTime(
  lastActiveAt: string | null | undefined,
  t: Required<AuthUsersSectionTexts>
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

export function getAdminRoleLabel(role: string, t: Required<AuthUsersSectionTexts>): string {
  const map: Record<string, string> = {
    superadmin: t.roleSuperadmin,
    admin: t.roleAdmin,
    manager: t.roleManager,
    'beta-tester': t.roleBetaTester,
    client: t.roleClient,
  }
  return map[role] || role
}
