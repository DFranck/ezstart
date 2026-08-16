'use client'

/**
 * Internal settings section embedded in `<AuthAdminDashboard>`.
 *
 * Stacks:
 * - Feature flags (toggle table)
 * - Maintenance mode (singleton editor)
 *
 * Both sub-sections auto-scoped server-side via JWT.
 *
 * @internal
 */

import { Div } from '@ezstart/ui/components'
import { type AuthSettingsSectionProps } from './settings/texts.js'
import { FeatureFlagsCard } from './settings/FeatureFlagsCard.js'
import { MaintenanceCard } from './settings/MaintenanceCard.js'

export {
  type AuthSettingsSectionFeatureFlagsTexts,
  type AuthSettingsSectionMaintenanceTexts,
  type AuthSettingsSectionProps,
  type AuthSettingsSectionTexts,
  DEFAULT_FEATURE_FLAGS_TEXTS,
  DEFAULT_MAINTENANCE_TEXTS,
} from './settings/texts.js'

/**
 * Combined settings panel: feature flags + maintenance mode.
 *
 * @internal
 */
export function AuthSettingsSection({ texts, className }: AuthSettingsSectionProps) {
  return (
    <Div className={className}>
      <Div className="space-y-6">
        <MaintenanceCard texts={texts?.maintenance} />
        <FeatureFlagsCard texts={texts?.featureFlags} />
      </Div>
    </Div>
  )
}
