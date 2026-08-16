/**
 * Text interfaces for Application management components.
 *
 * All user-facing strings are passed as props so the consumer controls i18n.
 * English defaults are exported so consumers can spread-merge partial overrides.
 */

export interface ApplicationsListTexts {
  title: string
  description: string
  newApplication: string
  loading: string
  errorTitle: string
  errorDescription: string
  retry: string
  emptyTitle: string
  emptyDescription: string
  emptyCta: string
  showArchived: string
  showAll: string
}

export interface ApplicationCardTexts {
  manage: string
  archive: string
  archiveTitle: string
  archiveConfirm: string
  archiveConfirmCascade: string
  archiveCancel: string
  archiveSubmit: string
  archiveSuccess: string
  archiveFailed: string
  statusActive: string
  statusArchived: string
  createdLabel: string
  keysLabel: string
}

export interface CreateApplicationModalTexts {
  title: string
  description: string
  nameLabel: string
  namePlaceholder: string
  slugLabel: string
  slugPlaceholder: string
  slugHelp: string
  slugInvalid: string
  slugTaken: string
  descriptionLabel: string
  descriptionPlaceholder: string
  cancel: string
  submit: string
  submitting: string
  createFailed: string
}

export interface ApplicationDetailViewTexts {
  back: string
  tabKeys: string
  tabSettings: string
  tabTheme: string
  /** Label for the new "Webhooks" tab housing the per-Application secret + endpoint UI. */
  tabWebhooks: string
  loading: string
  errorTitle: string
  errorDescription: string
  retry: string
  settingsTitle: string
  settingsDescription: string
  settingsSlugLabel: string
  settingsSlugHelp: string
  settingsNameLabel: string
  settingsDescriptionLabel: string
  settingsSave: string
  settingsSaving: string
  settingsSaveSuccess: string
  settingsSaveFailed: string
  /**
   * Label for the "Require email verification" toggle in the Settings tab.
   * Backs the composable email-verification gate (Clerk / Vercel pattern).
   */
  settingsRequireEmailVerificationLabel: string
  /** Help text under the "Require email verification" toggle. */
  settingsRequireEmailVerificationHelp: string
  archiveSectionTitle: string
  archiveSectionDescription: string
  archiveButton: string
  archiveConfirmTitle: string
  archiveConfirmDescription: string
  archiveConfirmCascade: string
  archiveCancel: string
  archiveSubmit: string
  archiveSuccess: string
  archiveFailed: string
  // Theme editor tab
  themeTitle: string
  themeDescription: string
  themeEnableLabel: string
  themeEnableHelp: string
  themeProLockedLabel: string
  themePrimaryLabel: string
  /**
   * Legacy label fields — kept optional for backwards compatibility with
   * consumers that still translate them, but they are NOT rendered by
   * `ApplicationThemeEditor` anymore (primary-only UI since 2026-04-24).
   */
  themeBackgroundLabel?: string
  themeForegroundLabel?: string
  themeAccentLabel?: string
  themeLogoLabel: string
  themeLogoPlaceholder: string
  themeReset: string
  themeSave: string
  themeSaving: string
  themeSaveSuccess: string
  themeSaveFailed: string
  themePreviewTitle: string
  themePreviewSubtitle: string
  themePreviewSignInCta: string
  // Webhook secret tab — Stripe-pattern reveal-once + rotate flow
  /** Card title for the webhook section. */
  webhookTitle: string
  /** Help text describing the per-Application HMAC secret + how it's used. */
  webhookDescription: string
  /** Label for the masked secret display. */
  webhookSecretLabel: string
  /** Help text under the masked secret (explains why the value is hidden). */
  webhookSecretMaskedHelp: string
  /** Banner title shown right after a successful regenerate (reveal-once). */
  webhookRevealTitle: string
  /** Banner body explaining the value will not be shown again. */
  webhookRevealHelp: string
  /** Copy button label inside the reveal banner. */
  webhookCopy: string
  /** Toast confirmation when the secret has been copied to the clipboard. */
  webhookCopySuccess: string
  /** "Hide" button label after the user has copied the secret. */
  webhookHide: string
  /** Button label that triggers the regenerate confirmation modal. */
  webhookRegenerate: string
  /** Spinner-state label while the rotation is in flight. */
  webhookRegenerating: string
  /** Toast confirmation after a successful rotation. */
  webhookRegenerateSuccess: string
  /** Toast error when the rotation fails. */
  webhookRegenerateFailed: string
  /** AlertDialog title — confirmation step before rotation. */
  webhookConfirmTitle: string
  /** AlertDialog body — explains the rotation is destructive. */
  webhookConfirmDescription: string
  /** AlertDialog cancel button. */
  webhookConfirmCancel: string
  /** AlertDialog confirm button — proceeds with the rotation. */
  webhookConfirmSubmit: string
  /** Label for the optional webhook endpoint URL field (read-only display). */
  webhookEndpointLabel: string
  /** Placeholder when no custom endpoint is configured. */
  webhookEndpointEmpty: string
  /** Help text under the endpoint URL field. */
  webhookEndpointHelp: string
}

export interface ApplicationsFlowTexts {
  list: ApplicationsListTexts
  card: ApplicationCardTexts
  create: CreateApplicationModalTexts
  detail: ApplicationDetailViewTexts
}

/** Default English texts for the Applications flow. */
export const defaultApplicationsFlowTexts: ApplicationsFlowTexts = {
  list: {
    title: 'Applications',
    description: 'Manage the apps that use your EZ keys',
    newApplication: 'New Application',
    loading: 'Loading applications...',
    errorTitle: 'Failed to load applications',
    errorDescription: 'Something went wrong. Please try again.',
    retry: 'Retry',
    emptyTitle: 'No applications yet',
    emptyDescription: 'Create your first application to start issuing API keys.',
    emptyCta: 'Create Application',
    showArchived: 'Show archived',
    showAll: 'Show all applications (superadmin)',
  },
  card: {
    manage: 'Manage',
    archive: 'Archive',
    archiveTitle: 'Archive Application',
    archiveConfirm: 'Are you sure you want to archive this application?',
    archiveConfirmCascade: 'This application has active keys. Archiving will also revoke them.',
    archiveCancel: 'Cancel',
    archiveSubmit: 'Archive',
    archiveSuccess: 'Application archived',
    archiveFailed: 'Failed to archive application',
    statusActive: 'Active',
    statusArchived: 'Archived',
    createdLabel: 'Created',
    keysLabel: 'keys',
  },
  create: {
    title: 'Create Application',
    description: 'Register a new app that will consume your EZ keys',
    nameLabel: 'Name',
    namePlaceholder: 'Acme Corp',
    slugLabel: 'Slug',
    slugPlaceholder: 'acme',
    slugHelp:
      'Lowercase, numbers and hyphens only (2-32 chars). Used in URLs and as app identifier.',
    slugInvalid: 'Invalid slug. Use lowercase letters, numbers and hyphens (2-32 chars).',
    slugTaken: 'This slug is already taken.',
    descriptionLabel: 'Description',
    descriptionPlaceholder: 'Optional — what this application does',
    cancel: 'Cancel',
    submit: 'Create',
    submitting: 'Creating...',
    createFailed: 'Failed to create application',
  },
  detail: {
    back: 'Back to applications',
    tabKeys: 'API Keys',
    tabSettings: 'Settings',
    tabTheme: 'Theme',
    tabWebhooks: 'Webhooks',
    loading: 'Loading application...',
    errorTitle: 'Failed to load application',
    errorDescription: 'Something went wrong. Please try again.',
    retry: 'Retry',
    settingsTitle: 'Settings',
    settingsDescription: 'Update application name and description. Slug is immutable.',
    settingsSlugLabel: 'Slug',
    settingsSlugHelp: 'Slug is immutable.',
    settingsNameLabel: 'Name',
    settingsDescriptionLabel: 'Description',
    settingsSave: 'Save',
    settingsSaving: 'Saving...',
    settingsSaveSuccess: 'Application updated',
    settingsSaveFailed: 'Failed to update application',
    settingsRequireEmailVerificationLabel: 'Require email verification',
    settingsRequireEmailVerificationHelp:
      'Signal to consumer apps that critical features should require a verified email. Login itself is never blocked. Defaults to off.',
    archiveSectionTitle: 'Archive application',
    archiveSectionDescription: 'Archived applications are hidden. Their API keys are revoked.',
    archiveButton: 'Archive Application',
    archiveConfirmTitle: 'Archive Application',
    archiveConfirmDescription:
      'Are you sure? This will hide the application and you will not be able to issue new keys for it.',
    archiveConfirmCascade: 'This application has active keys. Archiving will also revoke them.',
    archiveCancel: 'Cancel',
    archiveSubmit: 'Archive',
    archiveSuccess: 'Application archived',
    archiveFailed: 'Failed to archive application',
    themeTitle: 'White-label theme',
    themeDescription:
      'Override the primary color of the EZAuth login page for users of this application. Light/dark mode stays driven by each user preference.',
    themeEnableLabel: 'Apply theme to auth pages',
    themeEnableHelp:
      'When enabled, the primary color below replaces the default EZAuth accent on login, register, and password-reset pages for this application. Light/dark mode still follows each user own preference.',
    themeProLockedLabel: 'Included in EZAuth Pro',
    themePrimaryLabel: 'Primary color',
    themeLogoLabel: 'Logo URL (optional)',
    themeLogoPlaceholder: 'https://cdn.example.com/logo.svg',
    themeReset: 'Reset',
    themeSave: 'Save theme',
    themeSaving: 'Saving...',
    themeSaveSuccess: 'Theme saved',
    themeSaveFailed: 'Failed to save theme',
    themePreviewTitle: 'Welcome back',
    themePreviewSubtitle: 'Sign in to continue',
    themePreviewSignInCta: 'Sign in',
    webhookTitle: 'Webhook secret',
    webhookDescription:
      'Outbound webhooks (subscription lifecycle events, etc.) are signed with this per-Application HMAC secret. Verify the signature on your receiver before trusting the payload.',
    webhookSecretLabel: 'Secret',
    webhookSecretMaskedHelp:
      'For security, the full value is only shown once — right after creation or rotation. Regenerate to obtain a new value if you have lost the original.',
    webhookRevealTitle: 'Copy this secret now',
    webhookRevealHelp:
      'This is the only time the full value will be displayed. Store it in your receiver as an environment variable, then click Hide.',
    webhookCopy: 'Copy',
    webhookCopySuccess: 'Webhook secret copied to clipboard',
    webhookHide: 'Hide',
    webhookRegenerate: 'Regenerate secret',
    webhookRegenerating: 'Regenerating…',
    webhookRegenerateSuccess: 'Webhook secret rotated',
    webhookRegenerateFailed: 'Failed to rotate webhook secret',
    webhookConfirmTitle: 'Rotate webhook secret?',
    webhookConfirmDescription:
      'The current secret will stop working immediately. Make sure you can update your receiver before continuing.',
    webhookConfirmCancel: 'Cancel',
    webhookConfirmSubmit: 'Rotate secret',
    webhookEndpointLabel: 'Endpoint URL',
    webhookEndpointEmpty: 'Default endpoint (use the canonical EZAuth subscriptions URL)',
    webhookEndpointHelp:
      'Reserved for external consumers that host their own receiver. Leave empty to use the default.',
  },
}
