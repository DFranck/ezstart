'use client'

import { useLocale, useTranslations } from 'next-intl'
import { SubscribeCancelPage } from '@ezstart/pay-sdk/components'

/**
 * Subscription checkout cancel landing page for EZPay.
 *
 * Stripe Checkout redirects here when the user aborts a subscription
 * checkout. We confirm no charge was made and route the user back to pricing.
 *
 * Powered by `<SubscribeCancelPage>` from `@ezstart/pay-sdk/components`.
 */
export default function Page() {
  const t = useTranslations('cancel')
  const locale = useLocale()

  return (
    <SubscribeCancelPage
      backToPricingHref={`/${locale}/#pricing`}
      backHomeHref={`/${locale}`}
      texts={{
        title: t('title'),
        description: t('message'),
        primaryCtaLabel: t('backToPricing'),
        secondaryCtaLabel: t('backHome'),
        stepsTitle: t('needHelp'),
        steps: [t('noCharge'), t('contactSupport')],
      }}
    />
  )
}
