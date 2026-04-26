'use client'

import React from 'react'
import type { KnownIconName } from '@ezstart/ui/components'
import { CheckoutCallbackBase } from './common/CheckoutCallbackBase.js'

/**
 * User-overridable strings for `<DonateSuccessPage>`.
 * All fields are optional — English defaults are used when omitted.
 */
export interface DonateSuccessPageTexts {
  /** Page heading. Default: 'Thank You!' */
  title?: string
  /** Description below heading. Default: 'Your donation has been received successfully...' */
  description?: string
  /** Auto-redirect indicator. `{seconds}` interpolated. Default: 'Redirecting in {seconds}s…' */
  redirectingLabel?: string
  /** Primary CTA. Default: 'Back to home' */
  ctaLabel?: string
  /** "What's next" panel heading. Default: 'What happens next?' */
  stepsTitle?: string
  /** Bullet list under the panel (2 defaults). Pass `[]` to hide bullets. */
  steps?: string[]
  /** Reference line below the panel. `{id}` interpolated. Default: 'Reference: {id}' */
  referenceLabel?: string
}

const DEFAULT_TEXTS: Required<DonateSuccessPageTexts> = {
  title: 'Thank You!',
  description: 'Your donation has been received successfully. Your generosity makes a difference!',
  redirectingLabel: 'Redirecting in {seconds}s…',
  ctaLabel: 'Back to home',
  stepsTitle: 'What happens next?',
  steps: [
    'A receipt will be sent to your email via Stripe.',
    'Your receipt is available in your Stripe email.',
  ],
  referenceLabel: 'Reference: {id}',
}

const STEP_ICONS: KnownIconName[] = ['lucide:Mail', 'lucide:Receipt']

export interface DonateSuccessPageProps {
  /** Where to redirect after the auto-redirect delay. Default `'/'`. */
  redirectTo?: string
  /** Auto-redirect delay in ms. Default `0` (no auto-redirect). */
  redirectDelayMs?: number
  /** Fired once just before `router.push`. */
  onComplete?: () => void
  /** Override any text. English defaults are used when omitted. */
  texts?: DonateSuccessPageTexts
}

/**
 * Drop-in landing page for Stripe Checkout donation success redirects.
 *
 * Reads `?session_id=` from the URL and displays the thank-you state.
 * Auto-redirect is OFF by default (donations don't typically need to push
 * the user anywhere). Wraps `<Main>` from `@ezstart/ui/components`.
 *
 * @example
 * ```tsx
 * 'use client'
 * import { DonateSuccessPage } from '@ezstart/pay-sdk/components'
 *
 * export default function Page() {
 *   return <DonateSuccessPage />
 * }
 * ```
 */
export function DonateSuccessPage({
  redirectTo,
  redirectDelayMs = 0,
  onComplete,
  texts,
}: DonateSuccessPageProps): React.ReactElement {
  const t = { ...DEFAULT_TEXTS, ...texts }
  const stepsArr = texts?.steps ?? DEFAULT_TEXTS.steps

  return (
    <CheckoutCallbackBase
      tone="success"
      heroIcon="lucide:Heart"
      title={t.title}
      description={t.description}
      redirectTo={redirectTo}
      redirectDelayMs={redirectDelayMs}
      redirectingLabel={t.redirectingLabel}
      onComplete={onComplete}
      actions={[{ href: redirectTo || '/', label: t.ctaLabel, icon: 'lucide:Home' }]}
      stepsTitle={t.stepsTitle}
      stepsIcon="lucide:Sparkles"
      steps={stepsArr.map((label, idx) => ({
        icon: STEP_ICONS[idx] || ('lucide:Mail' as KnownIconName),
        label,
      }))}
      referenceLabel={t.referenceLabel}
    />
  )
}
