import { PaymentSuccessTemplate } from '@ezstart/ui/components'
import { getTranslations } from 'next-intl/server'

export default async function DonateSuccessPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getTranslations('donate.success')
  return (
    <PaymentSuccessTemplate
      redirectTo={`/${locale}`}
      fallbackHref={`/${locale}`}
      successMessage={t('message')}
      redirectMessage={t('redirecting')}
      errorMessage={t('error')}
      errorButtonText={t('backToHome')}
    />
  )
}
