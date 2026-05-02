'use client'

import {
  DonateSuccessTemplate,
  type DonateSuccessTemplateProps,
  type DonateSuccessTemplateTexts,
} from '@ezstart/ui/components'
import { useDeprecationWarning } from '@ezstart/ui/hooks'
import React from 'react'

/**
 * @deprecated Moved to `@ezstart/ui` as `DonateSuccessTemplate`. Will be
 * removed in 2026-08-01.
 */
export type DonateSuccessPageTexts = DonateSuccessTemplateTexts
/**
 * @deprecated Moved to `@ezstart/ui` as `DonateSuccessTemplate`. Will be
 * removed in 2026-08-01.
 */
export type DonateSuccessPageProps = DonateSuccessTemplateProps

/**
 * Drop-in landing page for Stripe Checkout donation success redirects.
 *
 * @deprecated Moved to `@ezstart/ui` as `DonateSuccessTemplate`. Will be
 * removed in 2026-08-01. Import `DonateSuccessTemplate` from
 * `@ezstart/ui/components` instead.
 */
export function DonateSuccessPage(props: DonateSuccessPageProps): React.ReactElement {
  useDeprecationWarning(
    'DonateSuccessPage from @ezstart/pay-sdk',
    'DonateSuccessTemplate from @ezstart/ui/components'
  )
  return <DonateSuccessTemplate {...props} />
}

DonateSuccessPage.displayName = 'DonateSuccessPage'
