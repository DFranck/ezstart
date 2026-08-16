'use client'

import {
  SubscribeSuccessTemplate,
  type SubscribeSuccessTemplateProps,
  type SubscribeSuccessTemplateTexts,
} from '@ezstart/ui/components'
import { useDeprecationWarning } from '@ezstart/ui/hooks'
import React from 'react'

/**
 * @deprecated Moved to `@ezstart/ui` as `SubscribeSuccessTemplate`. Will be
 * removed in 2026-08-01.
 */
export type SubscribeSuccessPageTexts = SubscribeSuccessTemplateTexts
/**
 * @deprecated Moved to `@ezstart/ui` as `SubscribeSuccessTemplate`. Will be
 * removed in 2026-08-01.
 */
export type SubscribeSuccessPageProps = SubscribeSuccessTemplateProps

/**
 * Drop-in landing page for Stripe Checkout subscription success redirects.
 *
 * @deprecated Moved to `@ezstart/ui` as `SubscribeSuccessTemplate`. Will be
 * removed in 2026-08-01. Import `SubscribeSuccessTemplate` from
 * `@ezstart/ui/components` instead.
 *
 * @example migration
 * ```tsx
 * // before
 * import { SubscribeSuccessPage } from '@ezstart/pay-sdk/components'
 * <SubscribeSuccessPage redirectTo="/dashboard" />
 *
 * // after
 * import { SubscribeSuccessTemplate } from '@ezstart/ui/components'
 * <SubscribeSuccessTemplate redirectTo="/dashboard" />
 * ```
 */
export function SubscribeSuccessPage(props: SubscribeSuccessPageProps): React.ReactElement {
  useDeprecationWarning(
    'SubscribeSuccessPage from @ezstart/pay-sdk',
    'SubscribeSuccessTemplate from @ezstart/ui/components'
  )
  return <SubscribeSuccessTemplate {...props} />
}

SubscribeSuccessPage.displayName = 'SubscribeSuccessPage'
