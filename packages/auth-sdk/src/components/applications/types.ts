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
  },
}
