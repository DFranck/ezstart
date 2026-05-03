'use client'

import { Badge } from '@ezstart/ui/components'
import { ENV_VARIANT, type RunEnv } from './e2e-tests-types'

interface EnvBadgeProps {
  env?: RunEnv | null
  /** Tooltip for screen readers + hover. Pass i18n string. */
  tooltip?: string
  /** Badge size — defaults to 'xs' since it's an inline meta marker. */
  size?: 'xs' | 'sm' | 'default'
  /** Visible label override — defaults to capitalized env name. */
  label?: string
}

/**
 * Tiny color-coded badge marking the env a run was executed in.
 *
 * Conventions :
 *   local      → info  (blue)   — dev machine
 *   staging    → warning (yellow) — preview / staging deploys
 *   production → success (green)  — live customers
 *
 * Renders nothing when `env` is null/undefined so we can safely embed it next
 * to legacy data that pre-dates the env dimension.
 */
export function EnvBadge({ env, tooltip, size = 'xs', label }: EnvBadgeProps) {
  if (!env) return null
  const display = label ?? env.charAt(0).toUpperCase() + env.slice(1)
  return (
    <Badge variant={ENV_VARIANT[env]} size={size} title={tooltip ?? `Run executed in ${env}`}>
      {display}
    </Badge>
  )
}
