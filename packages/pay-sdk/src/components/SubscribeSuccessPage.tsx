'use client'

import React from 'react'
import type { KnownIconName } from '@ezstart/ui/components'
import { CheckoutCallbackBase } from './common/CheckoutCallbackBase.js'

/**
 * User-overridable strings for `<SubscribeSuccessPage>`.
 * All fields are optional — English defaults are used when omitted.
 *
 * `redirectingLabel` and `referenceLabel` accept `{seconds}` and `{id}`
 * placeholders respectively (replaced at render time).
 */
export interface SubscribeSuccessPageTexts {
  /** Page heading. Default: 'Subscription Successful!' */
  title?: string
  /** Description below heading. Default: 'Your subscription is active and your account has been upgraded.' */
  description?: string
  /** Auto-redirect indicator. `{seconds}` interpolated. Default: 'Redirecting in {seconds}s…' */
  redirectingLabel?: string
  /** Primary CTA. Default: 'Go to dashboard' */
  ctaLabel?: string
  /** "What's next" panel heading. Default: 'What happens next?' */
  stepsTitle?: string
  /** Bullet list under the panel (3 defaults). Pass `[]` to hide bullets. */
  steps?: string[]
  /** Reference line below the panel. `{id}` interpolated. Default: 'Reference: {id}' */
  referenceLabel?: string
}

const DEFAULT_TEXTS: Required<SubscribeSuccessPageTexts> = {
  title: 'Subscription Successful!',
  description: 'Your subscription is active and your account has been upgraded.',
  redirectingLabel: 'Redirecting in {seconds}s…',
  ctaLabel: 'Go to dashboard',
  stepsTitle: 'What happens next?',
  steps: [
    'A receipt has been emailed to you via Stripe.',
    'Your new features and roles have been granted.',
    'Manage your subscription anytime from your account page.',
  ],
  referenceLabel: 'Reference: {id}',
}

const STEP_ICONS: KnownIconName[] = ['lucide:Mail', 'lucide:Zap', 'lucide:Receipt']

export interface SubscribeSuccessPageProps {
  /** Where to redirect after the auto-redirect delay. Default `'/'`. */
  redirectTo?: string
  /** Auto-redirect delay in ms. Default `3000`. Set `0` to disable. */
  redirectDelayMs?: number
  /** Fired once just before `router.push`. */
  onComplete?: () => void
  /** Override any text. English defaults are used when omitted. */
  texts?: SubscribeSuccessPageTexts
}

/**
 * Drop-in landing page for Stripe Checkout subscription success redirects.
 *
 * Reads `?session_id=` from the URL, displays the success state, then
 * auto-redirects after `redirectDelayMs`. Wraps `<Main>` from
 * `@ezstart/ui/components` (semantic HTML5).
 *
 * @example
 * ```tsx
 * 'use client'
 * import { SubscribeSuccessPage } from '@ezstart/pay-sdk/components'
 *
 * export default function Page() {
 *   return <SubscribeSuccessPage redirectTo="/dashboard" />
 * }
 * ```
 */
export function SubscribeSuccessPage({
  redirectTo = '/',
  redirectDelayMs = 3000,
  onComplete,
  texts,
}: SubscribeSuccessPageProps): React.ReactElement {
  const t = { ...DEFAULT_TEXTS, ...texts }
  const stepsArr = texts?.steps ?? DEFAULT_TEXTS.steps

  return (
    <CheckoutCallbackBase
      tone="success"
      heroIcon="lucide:CheckCircle"
      title={t.title}
      description={t.description}
      redirectTo={redirectTo}
      redirectDelayMs={redirectDelayMs}
      redirectingLabel={t.redirectingLabel}
      onComplete={onComplete}
      actions={[{ href: redirectTo, label: t.ctaLabel, icon: 'lucide:LayoutDashboard' }]}
      stepsTitle={t.stepsTitle}
      stepsIcon="lucide:Sparkles"
      steps={stepsArr.map((label, idx) => ({
        icon: STEP_ICONS[idx] || ('lucide:CheckCircle' as KnownIconName),
        label,
      }))}
      referenceLabel={t.referenceLabel}
    />
  )
}
