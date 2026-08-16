'use client'

import {
  PurchaseSuccessTemplate,
  type PurchaseSuccessTemplateProps,
  type PurchaseSuccessTemplateTexts,
} from '@ezstart/ui/components'
import { useDeprecationWarning } from '@ezstart/ui/hooks'
import React from 'react'

/**
 * @deprecated Moved to `@ezstart/ui` as `PurchaseSuccessTemplate`. Will be
 * removed in 2026-08-01.
 */
export type PurchaseSuccessPageTexts = PurchaseSuccessTemplateTexts
/**
 * @deprecated Moved to `@ezstart/ui` as `PurchaseSuccessTemplate`. Will be
 * removed in 2026-08-01.
 */
export type PurchaseSuccessPageProps = PurchaseSuccessTemplateProps

/**
 * Drop-in landing page for Stripe Checkout purchase success redirects.
 *
 * @deprecated Moved to `@ezstart/ui` as `PurchaseSuccessTemplate`. Will be
 * removed in 2026-08-01. Import `PurchaseSuccessTemplate` from
 * `@ezstart/ui/components` instead.
 */
export function PurchaseSuccessPage(props: PurchaseSuccessPageProps): React.ReactElement {
  useDeprecationWarning(
    'PurchaseSuccessPage from @ezstart/pay-sdk',
    'PurchaseSuccessTemplate from @ezstart/ui/components'
  )
  return <PurchaseSuccessTemplate {...props} />
}

PurchaseSuccessPage.displayName = 'PurchaseSuccessPage'
