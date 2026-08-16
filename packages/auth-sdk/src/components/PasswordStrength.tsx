'use client'

import { PasswordStrength as _PasswordStrength } from '@ezstart/ui/components'
import { useDeprecationWarning } from '@ezstart/ui/hooks'
import type {
  PasswordStrengthProps as _PasswordStrengthProps,
  PasswordStrengthTexts as _PasswordStrengthTexts,
} from '@ezstart/ui/components'

/**
 * @deprecated Moved to `@ezstart/ui` as `PasswordStrengthProps`. Will be removed in 2026-08-01.
 */
export type PasswordStrengthProps = _PasswordStrengthProps
/**
 * @deprecated Moved to `@ezstart/ui` as `PasswordStrengthTexts`. Will be removed in 2026-08-01.
 */
export type PasswordStrengthTexts = _PasswordStrengthTexts

/**
 * Visual strength indicator (color-graded bar + label) for a password input.
 *
 * @deprecated Moved to `@ezstart/ui`. Will be removed in 2026-08-01.
 * Import `PasswordStrength` from `@ezstart/ui/components` instead.
 *
 * @example migration
 * ```tsx
 * // before
 * import { PasswordStrength } from '@ezstart/auth-sdk/components'
 *
 * // after
 * import { PasswordStrength } from '@ezstart/ui/components'
 * ```
 */
export function PasswordStrength(props: PasswordStrengthProps) {
  useDeprecationWarning(
    'PasswordStrength from @ezstart/auth-sdk',
    'PasswordStrength from @ezstart/ui/components'
  )
  return <_PasswordStrength {...props} />
}

PasswordStrength.displayName = 'PasswordStrength'
