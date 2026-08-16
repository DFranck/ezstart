'use client'

import { PaymentSuccessTemplate, type PaymentSuccessTemplateProps } from '@ezstart/ui/components'
import { useDeprecationWarning } from '@ezstart/ui/hooks'
import React from 'react'

/**
 * @deprecated Moved to `@ezstart/ui` as `PaymentSuccessTemplate`. Will be
 * removed in 2026-08-01. Import `PaymentSuccessTemplate` from
 * `@ezstart/ui/components` instead.
 *
 * Backward-compat alias for the prop type so existing consumer code that
 * imports `PaymentSuccessPageProps` keeps compiling.
 */
export type PaymentSuccessPageProps = PaymentSuccessTemplateProps

/**
 * Standardized payment success page component for Stripe checkout integration.
 *
 * @deprecated Moved to `@ezstart/ui` as `PaymentSuccessTemplate`. Will be
 * removed in 2026-08-01. Import `PaymentSuccessTemplate` from
 * `@ezstart/ui/components` instead.
 *
 * @example migration
 * ```tsx
 * // before
 * import { PaymentSuccessPage } from '@ezstart/pay-sdk/components'
 * <PaymentSuccessPage redirectTo="/dashboard" />
 *
 * // after
 * import { PaymentSuccessTemplate } from '@ezstart/ui/components'
 * <PaymentSuccessTemplate redirectTo="/dashboard" />
 * ```
 */
export function PaymentSuccessPage(props: PaymentSuccessPageProps): React.ReactElement {
  useDeprecationWarning(
    'PaymentSuccessPage from @ezstart/pay-sdk',
    'PaymentSuccessTemplate from @ezstart/ui/components'
  )
  return <PaymentSuccessTemplate {...props} />
}

PaymentSuccessPage.displayName = 'PaymentSuccessPage'
