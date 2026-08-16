'use client'

import { ScopeContextSwitcher } from '@ezstart/ui/components'
import { useDeprecationWarning } from '@ezstart/ui/hooks'
import type {
  ScopeContextSwitcherProps as _ScopeContextSwitcherProps,
  ScopeContextSwitcherTexts as _ScopeContextSwitcherTexts,
  ScopeContextSwitcherLinkProps as _ScopeContextSwitcherLinkProps,
} from '@ezstart/ui/components'

/**
 * @deprecated Moved to `@ezstart/ui` as `ScopeContextSwitcherProps`. Will be removed in 2026-08-01.
 */
export type ScopeContextIndicatorProps = _ScopeContextSwitcherProps
/**
 * @deprecated Moved to `@ezstart/ui` as `ScopeContextSwitcherTexts`. Will be removed in 2026-08-01.
 */
export type ScopeContextIndicatorTexts = _ScopeContextSwitcherTexts
/**
 * @deprecated Moved to `@ezstart/ui` as `ScopeContextSwitcherLinkProps`. Will be removed in 2026-08-01.
 */
export type ScopeContextIndicatorLinkProps = _ScopeContextSwitcherLinkProps

/**
 * Header badge that surfaces the current scope (Personal / Admin) with an
 * optional toggle to switch contexts.
 *
 * @deprecated Moved to `@ezstart/ui` as `ScopeContextSwitcher`. Will be removed in 2026-08-01.
 * Import `ScopeContextSwitcher` from `@ezstart/ui/components` instead.
 *
 * @example migration
 * ```tsx
 * // before
 * import { ScopeContextIndicator } from '@ezstart/auth-sdk/components'
 * <ScopeContextIndicator scope="admin" canSwitchToAdmin switchPath="/dashboard" />
 *
 * // after
 * import { ScopeContextSwitcher } from '@ezstart/ui/components'
 * <ScopeContextSwitcher scope="admin" canSwitchToAdmin switchPath="/dashboard" />
 * ```
 */
export function ScopeContextIndicator(props: ScopeContextIndicatorProps) {
  useDeprecationWarning(
    'ScopeContextIndicator from @ezstart/auth-sdk',
    'ScopeContextSwitcher from @ezstart/ui/components'
  )
  return <ScopeContextSwitcher {...props} />
}

ScopeContextIndicator.displayName = 'ScopeContextIndicator'
