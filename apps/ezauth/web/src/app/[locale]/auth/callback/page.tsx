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
    />
  )
}
