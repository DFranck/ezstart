'use client'

import { useLocale, useTranslations } from 'next-intl'
import { PurchaseCancelPage } from '@ezstart/pay-sdk/components'

/**
 * Purchase checkout cancel landing page for EZPay.
 * Powered by `<PurchaseCancelPage>` from `@ezstart/pay-sdk/components`.
 */
export default function Page() {
  const t = useTranslations('cancel')
  const locale = useLocale()

  return (
    <PurchaseCancelPage
      tryAgainHref={`/${locale}`}
      backHomeHref={`/${locale}`}
      texts={{
        title: t('title'),
        description: t('message'),
        primaryCtaLabel: t('tryAgain'),
        secondaryCtaLabel: t('backHome'),
        stepsTitle: t('needHelp'),
        steps: [t('noCharge'), t('contactSupport')],
      }}
    />
  )
}
