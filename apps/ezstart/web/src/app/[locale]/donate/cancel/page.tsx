import { PaymentSuccessTemplate } from '@ezstart/ui/components'
import { getTranslations } from 'next-intl/server'

export default async function DonateCancelPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getTranslations('donate.cancel')
  return (
    <PaymentSuccessTemplate
      redirectTo={`/${locale}`}
      fallbackHref={`/${locale}`}
      errorMessage={t('message')}
      errorButtonText={t('backToHome')}
    />
  )
}
