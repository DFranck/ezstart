import { AuthCallbackPage } from '@ezstart/auth-sdk'
import { Div } from '@ezstart/ui/components'
import { getTranslations } from 'next-intl/server'

export default async function CallbackPage() {
  const t = await getTranslations('callback')
  return (
    <Div className="flex flex-1 items-center justify-center px-2">
      <AuthCallbackPage
        redirectTo="/developer"
        successMessage={t('success')}
        redirectMessage={t('redirecting')}
        processingMessage={t('processing')}
        errorTitle={t('errorTitle')}
        noCodeMessage={t('noCode')}
        errorButtonText={t('backToHome')}
      />
    </Div>
  )
}
