'use client'

import React from 'react'
import type { KnownIconName } from '@ezstart/ui/components'
import { CheckoutCallbackBase } from './common/CheckoutCallbackBase.js'

/**
 * User-overridable strings for `<DonateCancelPage>`.
 * All fields are optional — English defaults are used when omitted.
 */
export interface DonateCancelPageTexts {
  /** Page heading. Default: 'Payment Cancelled' */
  title?: string
  /** Description below heading. Default: 'Your payment was cancelled. No charges have been made.' */
  description?: string
  /** Primary CTA. Default: 'Try Again' */
  primaryCtaLabel?: string
  /** Secondary CTA. Default: 'Back to Home' */
  secondaryCtaLabel?: string
  /** "Need help" panel heading. Default: 'Need help?' */
  stepsTitle?: string
  /** Bullet list under the panel (2 defaults). Pass `[]` to hide bullets. */
  steps?: string[]
}

const DEFAULT_TEXTS: Required<DonateCancelPageTexts> = {
  title: 'Payment Cancelled',
  description: 'Your payment was cancelled. No charges have been made.',
  primaryCtaLabel: 'Try Again',
  secondaryCtaLabel: 'Back to Home',
  stepsTitle: 'Need help?',
  steps: [
    "Don't worry, no amount has been charged to your account.",
    'If you encountered an issue, please contact support.',
  ],
}

const STEP_ICONS: KnownIconName[] = ['lucide:ShieldCheck', 'lucide:Mail']

export interface DonateCancelPageProps {
  /** Primary CTA href. Default: `'/'`. */
  tryAgainHref?: string
  /** Secondary CTA href. Default: `'/'`. */
  backHomeHref?: string
  /** Override any text. English defaults are used when omitted. */
  texts?: DonateCancelPageTexts
}

/**
 * Drop-in landing page for Stripe Checkout donation cancel redirects.
 * Confirms no charge was made and offers a retry.
 *
 * @example
 * ```tsx
 * 'use client'
 * import { DonateCancelPage } from '@ezstart/pay-sdk/components'
 *
 * export default function Page() {
 *   return <DonateCancelPage tryAgainHref="/en/donate" />
 * }
 * ```
 */
export function DonateCancelPage({
  tryAgainHref = '/',
  backHomeHref = '/',
  texts,
}: DonateCancelPageProps): React.ReactElement {
  const t = { ...DEFAULT_TEXTS, ...texts }
  const stepsArr = texts?.steps ?? DEFAULT_TEXTS.steps

  return (
    <CheckoutCallbackBase
      tone="cancel"
      heroIcon="lucide:XCircle"
      title={t.title}
      description={t.description}
      actions={[
        { href: tryAgainHref, label: t.primaryCtaLabel, icon: 'lucide:Heart' },
        { href: backHomeHref, label: t.secondaryCtaLabel, icon: 'lucide:Home', variant: 'outline' },
      ]}
      stepsTitle={t.stepsTitle}
      stepsIcon="lucide:HelpCircle"
      steps={stepsArr.map((label, idx) => ({
        icon: STEP_ICONS[idx] || ('lucide:ShieldCheck' as KnownIconName),
        label,
      }))}
    />
  )
}
