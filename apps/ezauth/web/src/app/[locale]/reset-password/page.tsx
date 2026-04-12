'use client'

import { ResetPasswordForm, useAuthNavigation } from '@ezstart/auth-sdk'
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
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function ResetPasswordContent() {
  const t = useTranslations('resetPassword')
  const tValidation = useTranslations('validation')
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const { app } = useAuthNavigation()

  return (
    <Card className="max-w-md w-full" data-app={app}>
      <CardHeader className="text-center pb-4">
        <CardTitle className="text-xl md:text-2xl font-bold">{t('title')}</CardTitle>
        <CardDescription className="text-xs md:text-sm">{t('description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ResetPasswordForm
          token={token}
          texts={{
            newPassword: t('newPassword'),
            newPasswordPlaceholder: t('newPasswordPlaceholder'),
            confirmPassword: t('confirmPassword'),
            confirmPasswordPlaceholder: t('confirmPasswordPlaceholder'),
            submit: t('submit'),
            submitting: t('submitting'),
            required: tValidation('required'),
            minLength: tValidation('minLength', { min: '{min}' }),
            passwordMismatch: t('passwordMismatch'),
            invalidToken: t('invalidToken'),
            success: t('success'),
            tryAgain: t('tryAgain'),
            backToLogin: t('backToLogin'),
            fallbackError: t('fallbackError'),
          }}
        />
      </CardContent>
    </Card>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <Div className="flex items-center justify-center min-h-[200px]">
          <Spinner variant="primary" size="lg" />
        </Div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  )
}
