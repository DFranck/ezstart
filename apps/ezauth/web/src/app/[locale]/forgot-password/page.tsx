'use client'

import React from 'react'
import { getAppTheme } from '@/config/app-themes'
import { ForgotPasswordForm } from '@ezstart/auth-sdk'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Div,
} from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function ForgotPasswordContent() {
  const t = useTranslations('forgotPassword')
  const tValidation = useTranslations('validation')
  const searchParams = useSearchParams()
  const app = searchParams.get('app') || 'ezstart'
  const theme = getAppTheme(app)

  return (
    <Card
      className="max-w-md w-full"
      style={
        theme.brandColor
          ? ({
              '--brand': theme.brandColor,
              '--brand-foreground': theme.brandForeground ?? 'oklch(0.985 0 0)',
              '--color-brand': 'var(--brand)',
              '--color-brand-foreground': 'var(--brand-foreground)',
            } as React.CSSProperties)
          : undefined
      }
    >
      <CardHeader className="text-center pb-4">
        <CardTitle className="text-xl md:text-2xl font-bold">{t('title')}</CardTitle>
        <CardDescription className="text-xs md:text-sm">{t('description')}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <ForgotPasswordForm
          backHref={`/login?${searchParams.toString()}`}
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
