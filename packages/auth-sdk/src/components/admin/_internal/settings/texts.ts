/**
 * Public texts + props contract for `<AuthSettingsSection>` and its two
 * sub-cards (feature flags + maintenance mode).
 *
 * Extracted from the section component so the main file stays under the
 * 400-line policy ceiling. SDK-i18n-agnostic — every label has an English
 * default the consumer can override via the `texts` prop.
 *
 * @internal
 */

export interface AuthSettingsSectionFeatureFlagsTexts {
  title: string
  description: string
  enabled: string
  disabled: string
  columnKey: string
  columnDescription: string
  columnScope: string
  columnStatus: string
  columnUpdatedAt: string
  columnActions: string
  scopeGlobal: string
  scopeApp: string
  empty: string
  loading: string
  toggleSuccess: string
  toggleError: string
  refresh: string
}

export interface AuthSettingsSectionMaintenanceTexts {
  title: string
  description: string
  enable: string
  disable: string
  enabledBadge: string
  disabledBadge: string
  message: string
  messagePlaceholder: string
  scheduledEnd: string
  scheduledEndHelp: string
  startedAt: string
  saveButton: string
  enableButton: string
  disableButton: string
  saving: string
  saveSuccess: string
  saveError: string
  loading: string
  notSet: string
}

export interface AuthSettingsSectionTexts {
  featureFlags?: Partial<AuthSettingsSectionFeatureFlagsTexts>
  maintenance?: Partial<AuthSettingsSectionMaintenanceTexts>
}

export interface AuthSettingsSectionProps {
  /** Override default English labels. */
  texts?: AuthSettingsSectionTexts
  className?: string
}

export const DEFAULT_FEATURE_FLAGS_TEXTS: AuthSettingsSectionFeatureFlagsTexts = {
  title: 'Feature flags',
  description: 'Toggle platform features at runtime without redeploying.',
  enabled: 'Enabled',
  disabled: 'Disabled',
  columnKey: 'Key',
  columnDescription: 'Description',
  columnScope: 'Scope',
  columnStatus: 'Status',
  columnUpdatedAt: 'Updated',
  columnActions: 'Actions',
  scopeGlobal: 'Global',
  scopeApp: 'App',
  empty: 'No feature flags configured yet.',
  loading: 'Loading feature flags...',
  toggleSuccess: 'Feature flag updated.',
  toggleError: 'Failed to update feature flag.',
  refresh: 'Refresh',
}

export const DEFAULT_MAINTENANCE_TEXTS: AuthSettingsSectionMaintenanceTexts = {
  title: 'Maintenance mode',
  description: 'Display a platform-wide banner warning users of degraded service.',
  enable: 'Enable maintenance mode',
  disable: 'Disable maintenance mode',
  enabledBadge: 'Active',
  disabledBadge: 'Inactive',
  message: 'Banner message',
  messagePlaceholder: 'We are currently performing maintenance...',
  scheduledEnd: 'Scheduled end (optional)',
  scheduledEndHelp: 'When users can expect service to resume.',
  startedAt: 'Started at',
  saveButton: 'Save changes',
  enableButton: 'Enable maintenance',
  disableButton: 'Disable maintenance',
  saving: 'Saving...',
  saveSuccess: 'Maintenance mode updated.',
  saveError: 'Failed to update maintenance mode.',
  loading: 'Loading maintenance status...',
  notSet: 'Not set',
}
