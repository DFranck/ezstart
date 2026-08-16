'use client'

import {
  SubscribeCancelTemplate,
  type SubscribeCancelTemplateProps,
  type SubscribeCancelTemplateTexts,
} from '@ezstart/ui/components'
import { useDeprecationWarning } from '@ezstart/ui/hooks'
import React from 'react'

/**
 * @deprecated Moved to `@ezstart/ui` as `SubscribeCancelTemplate`. Will be
 * removed in 2026-08-01.
 */
export type SubscribeCancelPageTexts = SubscribeCancelTemplateTexts
/**
 * @deprecated Moved to `@ezstart/ui` as `SubscribeCancelTemplate`. Will be
 * removed in 2026-08-01.
 */
export type SubscribeCancelPageProps = SubscribeCancelTemplateProps

/**
 * Drop-in landing page for Stripe Checkout subscription cancel redirects.
 *
 * @deprecated Moved to `@ezstart/ui` as `SubscribeCancelTemplate`. Will be
 * removed in 2026-08-01. Import `SubscribeCancelTemplate` from
 * `@ezstart/ui/components` instead.
 */
export function SubscribeCancelPage(props: SubscribeCancelPageProps): React.ReactElement {
  useDeprecationWarning(
    'SubscribeCancelPage from @ezstart/pay-sdk',
    'SubscribeCancelTemplate from @ezstart/ui/components'
  )
  return <SubscribeCancelTemplate {...props} />
}

SubscribeCancelPage.displayName = 'SubscribeCancelPage'
