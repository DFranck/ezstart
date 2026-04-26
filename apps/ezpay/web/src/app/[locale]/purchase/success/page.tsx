'use client'

import { useLocale, useTranslations } from 'next-intl'
import { PurchaseSuccessPage } from '@ezstart/pay-sdk/components'

/**
 * Purchase checkout success landing page for EZPay.
 * Powered by `<PurchaseSuccessPage>` from `@ezstart/pay-sdk/components`.
 */
export default function Page() {
  const t = useTranslations('success')
  const locale = useLocale()

  return (
    <PurchaseSuccessPage
      redirectTo={`/${locale}`}
      texts={{
        title: t('purchaseTitle'),
        description: t('purchaseMessage'),
        ctaLabel: t('backHome'),
        stepsTitle: t('whatNext'),
        steps: [t('emailConfirmation'), t('accessGranted')],
        referenceLabel: t('reference', { id: '{id}' }),
      }}
    />
  )
}
