'use client'

/**
 * Auth-sdk UsageBadge — thin wrapper around `<ProgressBadge>` from
 * `@ezstart/ui` for API-key quota indicators.
 *
 * The data side of the badge (`useApiKeyUsage()`) stays in `@ezstart/auth-sdk`
 * because it's auth-domain specific (API keys belong to the auth surface).
 * The visual side is now provided by `<ProgressBadge>` so any quota surface
 * across the platform shares the exact same look + thresholds.
 *
 * Public API is unchanged — this is an internal refactor only.
 */

import { ProgressBadge } from '@ezstart/ui/components'
import type { UsageBadgeTexts } from './types.js'

export interface UsageBadgeProps {
  /** Number of API requests consumed this period. */
  used: number
  /** Monthly quota for this key. Pass `null` for unlimited keys. */
  quota: number | null
  /** Override default English texts (e.g. for i18n consumers). */
  texts?: UsageBadgeTexts
}

/**
 * Renders an API-key usage indicator: a tiny progress bar + percentage
 * badge whose color escalates through `success → warning → destructive`
 * as the consumer approaches the monthly quota.
 *
 * Uses the same color thresholds as before this component was refactored
 * (`>= 50%` warning, `>= 80%` destructive) so visual contracts stay stable.
 *
 * @example
 * ```tsx
 * <UsageBadge used={320} quota={1000} />
 * <UsageBadge used={0} quota={null} texts={{ unlimited: 'Illimité' }} />
 * ```
 */
export function UsageBadge({ used, quota, texts }: UsageBadgeProps) {
  return (
    <ProgressBadge
      usage={{ used, limit: quota }}
      texts={texts ? { unlimited: texts.unlimited } : undefined}
    />
  )
}
