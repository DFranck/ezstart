'use client'

import { Badge } from '@ezstart/ui/components'
import { TIER_VARIANT, type RunTier } from './e2e-tests-types'

interface TierBadgeProps {
  tier?: RunTier | null
  /** Tooltip for screen readers + hover. Pass i18n string. */
  tooltip?: string
  /** Badge size — defaults to 'xs' since it's an inline meta marker. */
  size?: 'xs' | 'sm' | 'default'
  /** Visible label override — defaults to capitalized tier name. */
  label?: string
}

/**
 * Tiny color-coded badge marking what a run actually exercised.
 *
 * Conventions :
 *   smoke       → cyan      — curl HTTP, no UI
 *   browser-e2e → purple    — full browser flow
 *   unit        → secondary — vitest/jest in-process
 *
 * Renders nothing when `tier` is null/undefined so we can safely embed it next
 * to legacy data that pre-dates the tier dimension.
 */
export function TierBadge({ tier, tooltip, size = 'xs', label }: TierBadgeProps) {
  if (!tier) return null
  const display =
    label ?? (tier === 'browser-e2e' ? 'Browser E2E' : tier.charAt(0).toUpperCase() + tier.slice(1))
  return (
    <Badge variant={TIER_VARIANT[tier]} size={size} title={tooltip ?? `Tier: ${tier}`}>
      {display}
    </Badge>
  )
}
