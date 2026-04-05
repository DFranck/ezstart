import { PaymentSuccessPage } from '@ezstart/pay-sdk'
import { getTranslations } from 'next-intl/server'

export default async function DonateSuccessPage() {
  const t = await getTranslations('donate.success')
  return (
    <PaymentSuccessPage
      redirectTo="/"
      successMessage={t('message')}
      redirectMessage={t('redirecting')}
      errorMessage={t('error')}
      errorButtonText={t('backToHome')}
    />
  )
}
