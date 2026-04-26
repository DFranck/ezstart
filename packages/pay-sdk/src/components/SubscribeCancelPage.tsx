'use client'

import React from 'react'
import type { KnownIconName } from '@ezstart/ui/components'
import { CheckoutCallbackBase } from './common/CheckoutCallbackBase.js'

/**
 * User-overridable strings for `<SubscribeCancelPage>`.
 * All fields are optional — English defaults are used when omitted.
 */
export interface SubscribeCancelPageTexts {
  /** Page heading. Default: 'Checkout Cancelled' */
  title?: string
  /** Description below heading. Default: 'Your subscription was not started. No charges have been made.' */
  description?: string
  /** Primary CTA. Default: 'Back to pricing' */
  primaryCtaLabel?: string
  /** Secondary CTA. Default: 'Back to home' */
  secondaryCtaLabel?: string
  /** "Need help" panel heading. Default: 'Need help?' */
  stepsTitle?: string
  /** Bullet list under the panel (2 defaults). Pass `[]` to hide bullets. */
  steps?: string[]
}

const DEFAULT_TEXTS: Required<SubscribeCancelPageTexts> = {
  title: 'Checkout Cancelled',
  description: 'Your subscription was not started. No charges have been made.',
  primaryCtaLabel: 'Back to pricing',
  secondaryCtaLabel: 'Back to home',
  stepsTitle: 'Need help?',
  steps: [
    "Don't worry — no amount has been charged to your account.",
    'If you encountered an issue, please reach out to support.',
  ],
}

const STEP_ICONS: KnownIconName[] = ['lucide:ShieldCheck', 'lucide:Mail']

export interface SubscribeCancelPageProps {
  /** Primary CTA href. Default: `'/#pricing'`. */
  backToPricingHref?: string
  /** Secondary CTA href. Default: `'/'`. */
  backHomeHref?: string
  /** Override any text. English defaults are used when omitted. */
  texts?: SubscribeCancelPageTexts
}

/**
 * Drop-in landing page for Stripe Checkout subscription cancel redirects.
 *
 * Confirms no charge was made and routes the user back to pricing or home.
 * Wraps `<Main>` from `@ezstart/ui/components` (semantic HTML5).
 *
 * @example
 * ```tsx
 * 'use client'
 * import { SubscribeCancelPage } from '@ezstart/pay-sdk/components'
 *
 * export default function Page() {
 *   return <SubscribeCancelPage backToPricingHref="/en/#pricing" />
 * }
 * ```
 */
export function SubscribeCancelPage({
  backToPricingHref = '/#pricing',
  backHomeHref = '/',
  texts,
}: SubscribeCancelPageProps): React.ReactElement {
  const t = { ...DEFAULT_TEXTS, ...texts }
  const stepsArr = texts?.steps ?? DEFAULT_TEXTS.steps

  return (
    <CheckoutCallbackBase
      tone="cancel"
      heroIcon="lucide:XCircle"
      title={t.title}
      description={t.description}
      actions={[
        { href: backToPricingHref, label: t.primaryCtaLabel, icon: 'lucide:CreditCard' },
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
