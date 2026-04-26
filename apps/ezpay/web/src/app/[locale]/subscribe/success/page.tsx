'use client'

import { useLocale, useTranslations } from 'next-intl'
import { SubscribeSuccessPage } from '@ezstart/pay-sdk/components'

/**
 * Subscription checkout success landing page for EZPay.
 *
 * Stripe Checkout redirects here with `session_id` in the query string. We
 * display a success screen and auto-redirect to the user's billing page
 * after 3 seconds.
 *
 * Powered by `<SubscribeSuccessPage>` from `@ezstart/pay-sdk/components`.
 */
export default function Page() {
  const t = useTranslations('success')
  const locale = useLocale()

  return (
    <SubscribeSuccessPage
      redirectTo={`/${locale}/dashboard?section=billing`}
      texts={{
        title: t('subscribeTitle'),
        description: t('subscribeMessage'),
        redirectingLabel: t('redirecting', { seconds: '{seconds}' }),
        ctaLabel: t('goToBilling'),
        stepsTitle: t('whatNext'),
        steps: [t('emailConfirmation'), t('accessGranted'), t('receiptAvailable')],
        referenceLabel: t('reference', { id: '{id}' }),
      }}
    />
  )
}
