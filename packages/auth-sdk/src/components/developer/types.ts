/**
 * Text interfaces for developer portal components.
 *
 * All user-facing strings are passed as props so the consumer controls i18n.
 */

export interface ApiKeysTableTexts {
  name: string
  keyPrefix: string
  status: string
  created: string
  lastUsed: string
  actions: string
  never: string
  usage: string
  statusActive: string
  statusRevoked: string
  rotate: string
  revoke: string
  unlimited: string
  /** Pagination — DataTable */
  paginationPrevious?: string
  paginationNext?: string
  /** Format strings, e.g. `'{count} row(s)'` and `'Page {current} of {total}'`. */
  paginationRows?: string
  paginationPageOf?: string
}

export interface CreateKeyModalTexts {
  title: string
  nameLabel: string
  namePlaceholder: string
  appScope: string
  appScopeAll: string
  /** Key type (publishable vs secret). */
  keyType: string
  keyTypePublishable: string
  keyTypeSecret: string
  /** Key environment (live vs test). */
  keyEnv: string
  keyEnvLive: string
  keyEnvTest: string
  /** Permission scope (admin/user/readonly). */
  keyScope: string
  keyScopeUser: string
  keyScopeReadonly: string
  keyScopeAdmin: string
  keyScopeAdminWarning: string
  expiry: string
  expiryNever: string
  expiry30d: string
  expiry90d: string
  expiry1y: string
  submit: string
  submitting: string
}

export interface KeyCreatedModalTexts {
  title: string
  warning: string
  copied: string
  copyKey: string
  done: string
}

export interface UsageDetailsModalTexts {
  detailsTitle: string
  detailsDescription: string
  close: string
  fetchError: string
  quotaTitle: string
  quotaLabel: string
  remaining: string
  topEndpoints: string
  dailyBreakdown: string
  noUsage: string
  unlimited: string
}

export interface UsageBadgeTexts {
  unlimited: string
}

export interface DeveloperPortalTexts {
  title: string
  description: string
  createKey: string
  noKeys: string
  retry: string
  fetchFailed: string
  createFailed: string
  revokeFailed: string
  rotateFailed: string
  revokeTitle: string
  revokeConfirm: string
  revokeSubmit: string
  revokeSuccess: string
  rotateSuccess: string
  cancel: string
  table: ApiKeysTableTexts
  create: CreateKeyModalTexts
  created: KeyCreatedModalTexts
  usage: UsageDetailsModalTexts
}

/** Default English texts for the developer portal. */
export const defaultDeveloperPortalTexts: DeveloperPortalTexts = {
  title: 'API Keys',
  description: 'Manage your developer API keys for programmatic access',
  createKey: 'Create New Key',
  noKeys: 'No API keys yet. Create one to get started.',
  retry: 'Retry',
  fetchFailed: 'Failed to load API keys',
  createFailed: 'Failed to create API key',
  revokeFailed: 'Failed to revoke API key',
  rotateFailed: 'Failed to rotate API key',
  revokeTitle: 'Revoke API Key',
  revokeConfirm: 'Are you sure you want to revoke this API key? This action cannot be undone.',
  revokeSubmit: 'Revoke',
  revokeSuccess: 'API key revoked',
  rotateSuccess: 'API key rotated',
  cancel: 'Cancel',
  table: {
    name: 'Name',
    keyPrefix: 'Key',
    status: 'Status',
    created: 'Created',
    lastUsed: 'Last Used',
    actions: 'Actions',
    never: 'Never',
    usage: 'Usage',
    statusActive: 'Active',
    statusRevoked: 'Revoked',
    rotate: 'Rotate',
    revoke: 'Revoke',
    unlimited: 'Unlimited',
    paginationPrevious: 'Previous',
    paginationNext: 'Next',
    paginationRows: '{count} row(s)',
    paginationPageOf: 'Page {current} of {total}',
  },
  create: {
    title: 'Create API Key',
    nameLabel: 'Key Name',
    namePlaceholder: 'My App Production',
    appScope: 'App Scope',
    appScopeAll: 'All apps',
    keyType: 'Key Type',
    keyTypePublishable: 'Publishable — safe to expose client-side',
    keyTypeSecret: 'Secret — server-only, never expose',
    keyEnv: 'Environment',
    keyEnvLive: 'Live — production',
    keyEnvTest: 'Test — sandbox, rate limited',
    keyScope: 'Permission Scope',
    keyScopeUser: 'User — standard permissions',
    keyScopeReadonly: 'Read-only — cannot modify data',
    keyScopeAdmin: 'Admin — full access (superadmin only)',
    keyScopeAdminWarning: 'Admin scope grants full platform access. Use with caution.',
    expiry: 'Expiry',
    expiryNever: 'Never',
    expiry30d: '30 days',
    expiry90d: '90 days',
    expiry1y: '1 year',
    submit: 'Create',
    submitting: 'Creating...',
  },
  created: {
    title: 'API Key Created',
    warning: 'Save this key now. You will not be able to see it again.',
    copied: 'Key copied to clipboard',
    copyKey: 'Copy Key',
    done: 'Done',
  },
  usage: {
    detailsTitle: 'Usage',
    detailsDescription: 'API key usage statistics for the current billing period',
    close: 'Close',
    fetchError: 'Failed to load usage data',
    quotaTitle: 'Monthly Quota',
    quotaLabel: '{used} / {limit} requests',
    remaining: '{count} requests remaining',
    topEndpoints: 'Top Endpoints',
    dailyBreakdown: 'Daily Breakdown (last 14 days)',
    noUsage: 'No usage recorded yet',
    unlimited: 'Unlimited',
  },
}
