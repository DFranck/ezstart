'use client'

import { useLocale, useTranslations } from 'next-intl'
import { SubscribeSuccessTemplate } from '@ezstart/ui/components'

/**
 * Subscription checkout success landing page.
 *
 * Stripe Checkout redirects here after a completed subscription checkout with
 * `session_id` in the query string. We display a success screen and auto
 * redirect to `/${locale}/dashboard` after a short delay so the user lands on
 * the dashboard with freshly-granted roles (applied server-side by the
 * EZPay -> EZAuth webhook).
 *
 * Powered by `<SubscribeSuccessTemplate>` from `@ezstart/ui/components` (the
 * presentation primitive — the legacy `<SubscribeSuccessPage>` wrapper from
 * `@ezstart/pay-sdk/components` was deprecated 2026-04, removal 2026-08-01).
 * The page only wires translations + the locale-aware redirect target.
 */
export default function Page() {
  const t = useTranslations('subscribe.success')
  const locale = useLocale()

  return (
    <SubscribeSuccessTemplate
      redirectTo={`/${locale}/dashboard`}
      texts={{
        title: t('title'),
        description: t('description'),
        redirectingLabel: t('redirecting', { seconds: '{seconds}' }),
        ctaLabel: t('goToDashboard'),
        stepsTitle: t('whatNext'),
        steps: [t('emailConfirmation'), t('accessGranted'), t('receiptAvailable')],
        referenceLabel: t('reference', { id: '{id}' }),
      }}
    />
  )
}
