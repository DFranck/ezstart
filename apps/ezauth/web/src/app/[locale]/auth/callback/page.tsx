import { AuthCallbackPage } from '@ezstart/auth-sdk'
import { getTranslations } from 'next-intl/server'

export default async function CallbackPage() {
  const t = await getTranslations('auth')
  return (
    <AuthCallbackPage
      redirectTo="/admin"
      successMessage={t('callback.success')}
      redirectMessage={t('callback.redirecting')}
      errorButtonText={t('callback.backToHome')}
      errorButtonClassName="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
    />
  )
}
