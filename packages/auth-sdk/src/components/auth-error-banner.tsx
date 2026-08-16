'use client'

import { ErrorAlert } from '@ezstart/ui/components'
import { useDeprecationWarning } from '@ezstart/ui/hooks'
import type {
  ErrorAlertProps as _ErrorAlertProps,
  ErrorAlertTexts as _ErrorAlertTexts,
} from '@ezstart/ui/components'

/**
 * @deprecated Moved to `@ezstart/ui` as `ErrorAlert`. Will be removed in 2026-08-01.
 * Import `ErrorAlert` from `@ezstart/ui/components` instead.
 *
 * Backward-compat alias for the prop types so existing consumer code that
 * imports `AuthErrorBannerProps` / `AuthErrorBannerTexts` keeps compiling.
 */
export type AuthErrorBannerProps = _ErrorAlertProps
/**
 * @deprecated Moved to `@ezstart/ui` as `ErrorAlertTexts`. Will be removed in 2026-08-01.
 */
export type AuthErrorBannerTexts = _ErrorAlertTexts

/**
 * Destructive alert wrapper for auth-related error messages.
 *
 * @deprecated Moved to `@ezstart/ui` as `ErrorAlert`. Will be removed in 2026-08-01.
 * Import `ErrorAlert` from `@ezstart/ui/components` instead.
 *
 * @example migration
 * ```tsx
 * // before
 * import { AuthErrorBanner } from '@ezstart/auth-sdk/components'
 * <AuthErrorBanner>Invalid credentials</AuthErrorBanner>
 *
 * // after
 * import { ErrorAlert } from '@ezstart/ui/components'
 * <ErrorAlert>Invalid credentials</ErrorAlert>
 * ```
 */
export function AuthErrorBanner(props: AuthErrorBannerProps) {
  useDeprecationWarning(
    'AuthErrorBanner from @ezstart/auth-sdk',
    'ErrorAlert from @ezstart/ui/components'
  )
  return <ErrorAlert {...props} />
}

AuthErrorBanner.displayName = 'AuthErrorBanner'
