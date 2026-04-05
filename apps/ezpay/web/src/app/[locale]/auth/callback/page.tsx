import { AuthCallbackPage } from '@ezstart/auth-sdk'
import { getTranslations } from 'next-intl/server'

export default async function CallbackPage() {
  const t = await getTranslations('auth.callback')
  return (
    <AuthCallbackPage
      redirectTo="/"
      successMessage={t('success')}
      redirectMessage={t('redirecting')}
      errorButtonText={t('backToHome')}
      errorButtonClassName="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
    />
  )
}
