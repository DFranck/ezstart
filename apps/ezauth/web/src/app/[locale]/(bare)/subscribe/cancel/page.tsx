'use client'

import { useLocale, useTranslations } from 'next-intl'
import { SubscribeCancelTemplate } from '@ezstart/ui/components'

/**
 * Subscription checkout cancel landing page.
 *
 * Stripe Checkout redirects here when the user aborts a subscription checkout.
 * We confirm no charge was made and route the user back to pricing.
 *
 * Powered by `<SubscribeCancelTemplate>` from `@ezstart/ui/components` (the
 * presentation primitive — the legacy `<SubscribeCancelPage>` wrapper from
 * `@ezstart/pay-sdk/components` was deprecated 2026-04, removal 2026-08-01).
 */
export default function Page() {
  const t = useTranslations('subscribe.cancel')
  const locale = useLocale()

  return (
    <SubscribeCancelTemplate
      backToPricingHref={`/${locale}/#pricing`}
      backHomeHref={`/${locale}`}
      texts={{
        title: t('title'),
        description: t('description'),
        primaryCtaLabel: t('backToPricing'),
        secondaryCtaLabel: t('backHome'),
        stepsTitle: t('needHelp'),
        steps: [t('noCharge'), t('contactSupport')],
      }}
    />
  )
}
