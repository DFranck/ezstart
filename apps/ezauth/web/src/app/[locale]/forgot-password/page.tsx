'use client'

import { ForgotPasswordForm, useAuthNavigation } from '@ezstart/auth-sdk'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Div,
} from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'
import { Suspense } from 'react'

function ForgotPasswordContent() {
  const t = useTranslations('forgotPassword')
  const tValidation = useTranslations('validation')
  const navigation = useAuthNavigation()
  const app = navigation.app || 'ezstart'

  return (
    <Card className="max-w-md w-full" data-app={app}>
      <CardHeader className="text-center pb-4">
        <CardTitle className="text-xl md:text-2xl font-bold">{t('title')}</CardTitle>
        <CardDescription className="text-xs md:text-sm">{t('description')}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <ForgotPasswordForm
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
    <Suspense fallback={<Div className="animate-pulse bg-muted rounded h-32" />}>
      <ForgotPasswordContent />
    </Suspense>
  )
}
