'use client'

import { ResetPasswordForm, useAuthNavigation } from '@ezstart/auth-sdk'
import { apiCall, ApiError, parseApiErrorCode } from '@ezstart/api-sdk'
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
import { Suspense, useCallback } from 'react'

async function validateResetToken(token: string): Promise<{ valid: boolean; code?: string }> {
  try {
    const data = await apiCall<{ valid: boolean }>('/auth/validate-reset-token', {
      appName: 'ezauth',
      method: 'POST',
      body: { token },
    })
    return { valid: data?.valid === true }
  } catch (err: unknown) {
    if (ApiError.isApiError(err)) {
      return { valid: false, code: parseApiErrorCode(err.data) }
    }
    return { valid: false }
  }
}

function ResetPasswordContent() {
  const t = useTranslations('resetPassword')
  const tValidation = useTranslations('validation')
  const tPwd = useTranslations('passwordStrength')
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const { app, forgotPasswordHref } = useAuthNavigation()

  const handleValidateToken = useCallback(
    (tokenValue: string) => validateResetToken(tokenValue),
    []
  )

  return (
    <Card className="max-w-md w-full max-h-[90vh] overflow-y-auto" data-app={app}>
      <CardHeader className="text-center pb-4">
        <CardTitle className="text-xl md:text-2xl font-bold">{t('title')}</CardTitle>
        <CardDescription className="text-xs md:text-sm">{t('description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ResetPasswordForm
          token={token}
          onValidateToken={handleValidateToken}
          requestNewLinkHref={forgotPasswordHref}
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
            passwordWeak: tPwd('weak'),
            passwordFair: tPwd('fair'),
            passwordGood: tPwd('good'),
            passwordStrong: tPwd('strong'),
            validating: t('validating'),
            tokenExpired: t('tokenExpired'),
            requestNewLink: t('requestNewLink'),
            errorInvalidToken: t('errorInvalidToken'),
          }}
        />
      </CardContent>
    </Card>
  )
}

export default function ResetPasswordPage() {
  const t = useTranslations('resetPassword')

  return (
    <Div className="flex flex-1 items-center justify-center px-2">
      <Suspense
        fallback={
          <Div className="flex items-center justify-center min-h-[200px]">
            <Spinner variant="primary" size="lg" text={t('loading')} />
          </Div>
        }
      >
        <ResetPasswordContent />
      </Suspense>
    </Div>
  )
}
