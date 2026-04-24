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

interface ForgotPasswordContentProps {
  ssrAppName: string | null
  ssrAppDisplayName: string | null
}

function ForgotPasswordContent({ ssrAppName }: ForgotPasswordContentProps) {
  // Display name intentionally unused on this page — the forgot-password form
  // only needs the app slug for the email template context.
  const t = useTranslations('forgotPassword')
  const tValidation = useTranslations('validation')
  const navigation = useAuthNavigation()

  // Resolve app from ?key= (publishable key) or fallback to ?app= (legacy).
  // The display name is not rendered on this page, so we only need the slug
  // (passed to the form for the email template context).
  const keyConfig = useKeyConfig(navigation.publishableKey)
  const app = keyConfig.appName ?? navigation.app ?? ssrAppName ?? 'ezauth'

  return (
    <Card className="max-w-md w-full max-h-[90vh] overflow-y-auto">
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

interface ForgotPasswordClientProps {
  ssrAppName: string | null
  ssrAppDisplayName: string | null
}

export default function ForgotPasswordClient({
  ssrAppName,
  ssrAppDisplayName,
}: ForgotPasswordClientProps) {
  return (
    <Div className="flex flex-1 items-center justify-center px-2">
      <Suspense
        fallback={
          <Div className="flex items-center justify-center min-h-[200px]">
            <Spinner variant="primary" size="lg" />
          </Div>
        }
      >
        <ForgotPasswordContent ssrAppName={ssrAppName} ssrAppDisplayName={ssrAppDisplayName} />
      </Suspense>
    </Div>
  )
}
