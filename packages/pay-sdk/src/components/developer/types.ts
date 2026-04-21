/**
 * Text interfaces for the EZPay developer portal components.
 *
 * All user-facing strings are passed as props so the consumer controls i18n.
 * English defaults are provided below — pass a `Partial<PayDeveloperPortalTexts>`
 * to override any subset.
 */

export interface PayApiKeysTableTexts {
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
}

export interface CreatePayKeyModalTexts {
  title: string
  nameLabel: string
  namePlaceholder: string
  /** Application slug display (read-only, pre-filled). */
  appScope: string
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

export interface PayDeveloperPortalTexts {
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
  selectApplicationNotice: string
  table: PayApiKeysTableTexts
  create: CreatePayKeyModalTexts
  created: KeyCreatedModalTexts
}

/** Default English texts for the EZPay developer portal. */
export const defaultPayDeveloperPortalTexts: PayDeveloperPortalTexts = {
  title: 'EZPay API Keys',
  description: 'Manage your EZPay API keys for programmatic access',
  createKey: 'Create New Key',
  noKeys: 'No EZPay API keys yet. Create one to get started.',
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
  selectApplicationNotice: 'Select an Application above to view its EZPay keys.',
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
  },
  create: {
    title: 'Create EZPay API Key',
    nameLabel: 'Key Name',
    namePlaceholder: 'My App Production',
    appScope: 'Application',
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
    title: 'EZPay API Key Created',
    warning: 'Save this key now. You will not be able to see it again.',
    copied: 'Key copied to clipboard',
    copyKey: 'Copy Key',
    done: 'Done',
  },
}
