'use client'

import {
  PurchaseCancelTemplate,
  type PurchaseCancelTemplateProps,
  type PurchaseCancelTemplateTexts,
} from '@ezstart/ui/components'
import { useDeprecationWarning } from '@ezstart/ui/hooks'
import React from 'react'

/**
 * @deprecated Moved to `@ezstart/ui` as `PurchaseCancelTemplate`. Will be
 * removed in 2026-08-01.
 */
export type PurchaseCancelPageTexts = PurchaseCancelTemplateTexts
/**
 * @deprecated Moved to `@ezstart/ui` as `PurchaseCancelTemplate`. Will be
 * removed in 2026-08-01.
 */
export type PurchaseCancelPageProps = PurchaseCancelTemplateProps

/**
 * Drop-in landing page for Stripe Checkout purchase cancel redirects.
 *
 * @deprecated Moved to `@ezstart/ui` as `PurchaseCancelTemplate`. Will be
 * removed in 2026-08-01. Import `PurchaseCancelTemplate` from
 * `@ezstart/ui/components` instead.
 */
export function PurchaseCancelPage(props: PurchaseCancelPageProps): React.ReactElement {
  useDeprecationWarning(
    'PurchaseCancelPage from @ezstart/pay-sdk',
    'PurchaseCancelTemplate from @ezstart/ui/components'
  )
  return <PurchaseCancelTemplate {...props} />
}

PurchaseCancelPage.displayName = 'PurchaseCancelPage'
