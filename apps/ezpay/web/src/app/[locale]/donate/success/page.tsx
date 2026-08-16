'use client'

import { useLocale, useTranslations } from 'next-intl'
import { DonateSuccessPage } from '@ezstart/pay-sdk/components'

/**
 * Donation checkout success landing page for EZPay.
 * Powered by `<DonateSuccessPage>` from `@ezstart/pay-sdk/components`.
 */
export default function Page() {
  const t = useTranslations('success')
  const locale = useLocale()

  return (
    <DonateSuccessPage
      redirectTo={`/${locale}`}
      texts={{
        title: t('donateTitle'),
        description: t('donateMessage'),
        ctaLabel: t('backHome'),
        stepsTitle: t('whatNext'),
        steps: [t('emailConfirmation'), t('receiptAvailable')],
        referenceLabel: t('reference', { id: '{id}' }),
      }}
    />
  )
}
