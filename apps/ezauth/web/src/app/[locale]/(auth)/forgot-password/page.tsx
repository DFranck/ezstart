'use client'

import { ForgotPasswordForm, useAuthNavigation } from '@ezstart/auth-sdk'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Div,
  Spinner,
} from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'
import { Suspense } from 'react'
import { useKeyConfig } from '@/hooks/useKeyConfig'
import { useDynamicAppTheme } from '@/hooks/useDynamicAppTheme'

function ForgotPasswordContent() {
  const t = useTranslations('forgotPassword')
  const tValidation = useTranslations('validation')
  const navigation = useAuthNavigation()

  // Resolve app from ?key= (publishable key) or fallback to ?app= (legacy)
  const keyConfig = useKeyConfig(navigation.publishableKey)
  const app = keyConfig.appName ?? navigation.app ?? 'ezauth'

  // Sync <html data-app="..."> on the client so the per-app theme CSS kicks
  // in (middleware only sets the SSR header for `?app=` legacy, not `?key=`).
  useDynamicAppTheme(app)

  return (
    <Card className="max-w-md w-full max-h-[90vh] overflow-y-auto" data-app={app}>
      <CardHeader className="text-center pb-4">
        <CardTitle className="text-xl md:text-2xl font-bold">{t('title')}</CardTitle>
        <CardDescription className="text-xs md:text-sm">{t('description')}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <ForgotPasswordForm
          appName={app}
          texts={{
            email: t('email'),
            emailPlaceholder: t('emailPlaceholder'),
            submit: t('submit'),
            submitting: t('submitting'),
            required: tValidation('required'),
            invalidEmail: tValidation('invalidEmail'),
            success: t('success'),
            backToLogin: t('backToLogin'),
          }}
        />
      </CardContent>
    </Card>
  )
}

export default function ForgotPasswordPage() {
  return (
    <Div className="flex flex-1 items-center justify-center px-2">
      <Suspense
        fallback={
          <Div className="flex items-center justify-center min-h-[200px]">
            <Spinner variant="primary" size="lg" />
          </Div>
        }
      >
        <ForgotPasswordContent />
      </Suspense>
    </Div>
  )
}
