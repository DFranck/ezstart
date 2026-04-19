'use client'

import { VerifyEmailFlow, useAuthNavigation } from '@ezstart/auth-sdk'
import { Card, CardContent, CardHeader, CardTitle, Div, Spinner } from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function VerifyEmailContent() {
  const t = useTranslations('verifyEmail')
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const { app } = useAuthNavigation()

  return (
    <Card className="max-w-md w-full" data-app={app}>
      <CardHeader className="text-center pb-4">
        <CardTitle className="text-xl md:text-2xl font-bold">{t('title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <VerifyEmailFlow
          token={token}
          texts={{
            verifying: t('verifying'),
            success: t('success'),
            alreadyVerified: t('alreadyVerified'),
            invalid: t('invalidToken'),
            error: t('error'),
            backToLogin: t('backToLogin'),
            tryAgain: t('resendLink'),
          }}
        />
      </CardContent>
    </Card>
  )
}

export default function VerifyEmailPage() {
  return (
    <Div className="flex flex-1 items-center justify-center px-2">
      <Suspense
        fallback={
          <Div className="flex justify-center py-8">
            <Spinner variant="primary" size="lg" />
          </Div>
        }
      >
        <VerifyEmailContent />
      </Suspense>
    </Div>
  )
}
