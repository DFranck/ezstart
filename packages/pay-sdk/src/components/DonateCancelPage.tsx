'use client'

import {
  DonateCancelTemplate,
  type DonateCancelTemplateProps,
  type DonateCancelTemplateTexts,
} from '@ezstart/ui/components'
import { useDeprecationWarning } from '@ezstart/ui/hooks'
import React from 'react'

/**
 * @deprecated Moved to `@ezstart/ui` as `DonateCancelTemplate`. Will be
 * removed in 2026-08-01.
 */
export type DonateCancelPageTexts = DonateCancelTemplateTexts
/**
 * @deprecated Moved to `@ezstart/ui` as `DonateCancelTemplate`. Will be
 * removed in 2026-08-01.
 */
export type DonateCancelPageProps = DonateCancelTemplateProps

/**
 * Drop-in landing page for Stripe Checkout donation cancel redirects.
 *
 * @deprecated Moved to `@ezstart/ui` as `DonateCancelTemplate`. Will be
 * removed in 2026-08-01. Import `DonateCancelTemplate` from
 * `@ezstart/ui/components` instead.
 */
export function DonateCancelPage(props: DonateCancelPageProps): React.ReactElement {
  useDeprecationWarning(
    'DonateCancelPage from @ezstart/pay-sdk',
    'DonateCancelTemplate from @ezstart/ui/components'
  )
  return <DonateCancelTemplate {...props} />
}

DonateCancelPage.displayName = 'DonateCancelPage'
