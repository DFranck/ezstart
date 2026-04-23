import { PaymentSuccessPage } from '@ezstart/pay-sdk'
import { getTranslations } from 'next-intl/server'

export default async function DonateSuccessPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getTranslations('donate.success')
  return (
    <PaymentSuccessPage
      redirectTo={`/${locale}`}
      fallbackHref={`/${locale}`}
      successMessage={t('message')}
      redirectMessage={t('redirecting')}
      errorMessage={t('error')}
      errorButtonText={t('backToHome')}
    />
  )
}
