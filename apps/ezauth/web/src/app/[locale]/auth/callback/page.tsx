import { AuthCallbackPage } from '@ezstart/auth-sdk'
import { Div } from '@ezstart/ui/components'
import { getTranslations } from 'next-intl/server'

export default async function CallbackPage() {
  const t = await getTranslations('auth')
  return (
    <Div className="flex flex-1 items-center justify-center px-2">
      <AuthCallbackPage
        redirectTo="/admin"
        successMessage={t('callback.success')}
        redirectMessage={t('callback.redirecting')}
        errorButtonText={t('callback.backToHome')}
      />
    </Div>
  )
}
