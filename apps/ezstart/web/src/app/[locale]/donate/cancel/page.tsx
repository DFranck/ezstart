import { PaymentSuccessPage } from '@ezstart/pay-sdk'
import { getTranslations } from 'next-intl/server'

export default async function DonateCancelPage() {
  const t = await getTranslations('donate.cancel')
  return (
    <PaymentSuccessPage
      redirectTo="/"
      errorMessage={t('message')}
      errorButtonText={t('backToHome')}
    />
  )
}
