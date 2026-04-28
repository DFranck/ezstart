/**
 * Internal shared types and constants for the Applications section of `<AuthAdminDashboard>`.
 *
 * @internal
 */

import type { Application } from '../../core/types.js'

/** Display row used by the admin Applications table. */
export type AdminApplicationRow = Application

export interface AuthApplicationsSectionTexts {
  // Header
  title?: string
  subtitle?: string

  // Stats
  totalApplications?: string
  activeApplications?: string
  archivedApplications?: string
  platformOwned?: string
  themedApplications?: string

  // Search + filters
  searchPlaceholder?: string
  statusAll?: string
  statusActive?: string
  statusArchived?: string

  // Table columns
  columnSlug?: string
  columnName?: string
  columnOwner?: string
  columnStatus?: string
  columnTheme?: string
  columnPlatform?: string
  columnCreatedAt?: string
  columnActions?: string

  // Status badges
  badgeActive?: string
  badgeArchived?: string
  badgePlatform?: string
  badgeThemed?: string
  badgeThemeDisabled?: string

  // Actions
  edit?: string
  archive?: string
  unarchive?: string
  noApplications?: string

  // Create modal
  createApplication?: string

  // Edit modal
  editTitle?: string
  editDescription?: string
  editNameLabel?: string
  editDescriptionLabel?: string
  editSlugLabel?: string
  editSlugHelp?: string
  cancel?: string
  save?: string
  saving?: string
  editError?: string
  editSuccess?: string

  // Archive dialog
  confirmArchiveTitle?: string
  confirmArchiveDescription?: string
  confirmArchiveCascade?: string
  confirm?: string
  archiveError?: string
  archiveSuccess?: string

  // Pagination
  previous?: string
  next?: string
  /** "{count} row(s)" template. */
  rows?: string
  /** "Page {current} of {total}" template. */
  pageOf?: string
}

export const ADMIN_APPLICATIONS_PAGE_SIZE = 20

export const DEFAULT_APPLICATIONS_TEXTS: Required<AuthApplicationsSectionTexts> = {
  title: 'Applications',
  subtitle: 'Manage Applications across all tenants.',
  totalApplications: 'Total',
  activeApplications: 'Active',
  archivedApplications: 'Archived',
  platformOwned: 'Platform-owned',
  themedApplications: 'White-label',
  searchPlaceholder: 'Search by slug, name, or owner...',
  statusAll: 'All statuses',
  statusActive: 'Active only',
  statusArchived: 'Archived only',
  columnSlug: 'Slug',
  columnName: 'Name',
  columnOwner: 'Owner',
  columnStatus: 'Status',
  columnTheme: 'Theme',
  columnPlatform: 'Platform',
  columnCreatedAt: 'Created',
  columnActions: 'Actions',
  badgeActive: 'Active',
  badgeArchived: 'Archived',
  badgePlatform: 'Platform',
  badgeThemed: 'Themed',
  badgeThemeDisabled: 'Off',
  edit: 'Edit',
  archive: 'Archive',
  unarchive: 'Unarchive',
  noApplications: 'No applications found.',
  createApplication: 'New Application',
  editTitle: 'Edit Application',
  editDescription: 'Update Application name, description, and metadata. Slug is immutable.',
  editNameLabel: 'Name',
  editDescriptionLabel: 'Description',
  editSlugLabel: 'Slug',
  editSlugHelp: 'Slug is immutable.',
  cancel: 'Cancel',
  save: 'Save',
  saving: 'Saving...',
  editError: 'Failed to update Application.',
  editSuccess: 'Application updated successfully.',
  confirmArchiveTitle: 'Archive Application',
  confirmArchiveDescription:
    'Are you sure you want to archive this Application? Any active API keys will be revoked.',
  confirmArchiveCascade: 'This Application has active API keys. Archiving will also revoke them.',
  confirm: 'Confirm',
  archiveError: 'Failed to archive Application.',
  archiveSuccess: 'Application archived successfully.',
  previous: 'Previous',
  next: 'Next',
  rows: '{count} row(s)',
  pageOf: 'Page {current} of {total}',
}

export function formatAdminApplicationDate(dateStr: string, locale?: string): string {
  return new Intl.DateTimeFormat(locale ?? undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(dateStr))
}
