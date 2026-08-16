/**
 * Pure format/derivation helpers for `<UserDashboard>` tabs.
 *
 * @internal
 */

import type { UserDashboardUser } from './types.js'

export function formatDate(dateStr: string | undefined | null): string {
  if (!dateStr) return '-'
  try {
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    return '-'
  }
}

export function getDisplayName(user: {
  firstName?: string
  lastName?: string
  username: string
}): string {
  if (user.firstName) return user.firstName
  return user.username
}

export function getUserRoleCount(
  user: Pick<UserDashboardUser, 'globalRoles' | 'appRoles'>,
  appName?: string
): number {
  let count = user.globalRoles?.length ?? 0
  if (appName && user.appRoles?.[appName]) {
    count += user.appRoles[appName].length
  }
  return count
}
