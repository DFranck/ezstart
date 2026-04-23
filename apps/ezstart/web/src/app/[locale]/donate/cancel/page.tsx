import { PaymentSuccessPage } from '@ezstart/pay-sdk'
import { getTranslations } from 'next-intl/server'

export default async function DonateCancelPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getTranslations('donate.cancel')
  return (
    <PaymentSuccessPage
      redirectTo={`/${locale}`}
      fallbackHref={`/${locale}`}
      errorMessage={t('message')}
      errorButtonText={t('backToHome')}
    />
  )
}
