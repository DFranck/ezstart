import { AuthCallbackPage } from '@ezstart/auth-sdk'
import { Section } from '@ezstart/ui/components'
import { getTranslations } from 'next-intl/server'

export default async function CallbackPage() {
  const t = await getTranslations('callback')
  return (
    <Section className="px-2">
      <AuthCallbackPage
        redirectTo="/dashboard"
        successMessage={t('success')}
        redirectMessage={t('redirecting')}
        processingMessage={t('processing')}
        errorTitle={t('errorTitle')}
        noCodeMessage={t('noCode')}
        errorButtonText={t('backToHome')}
      />
    </Section>
  )
}
