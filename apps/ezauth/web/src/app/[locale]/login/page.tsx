'use client'

import React from 'react'
import { getAppTheme } from '@/config/app-themes'
import { SignInForm, useAuthNavigation } from '@ezstart/auth-sdk'
import { ThemeSwitcher } from '@ezstart/ui/theme/components'
import {
  BackButton,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  Div,
  P,
  Span,
  Spinner,
} from '@ezstart/ui/components'
import Link from 'next/link'
import { Suspense } from 'react'
import { useTranslations } from 'next-intl'

function LoginContent() {
  const t = useTranslations('login')
  const tForgot = useTranslations('forgotPassword')
  const tValidation = useTranslations('validation')
  const tApiErrors = useTranslations('apiErrors')
  const tOAuth = useTranslations('oauth')
  const tTwoFactor = useTranslations('twoFactor')
  const navigation = useAuthNavigation()
  const app = navigation.app || 'ezstart'
  const theme = getAppTheme(app)

  return (
    <Card className="max-w-md w-full relative" data-app={app}>
      <Div className="absolute top-4 left-4">
        <BackButton />
      </Div>
      <Div className="absolute top-4 right-4">
        <ThemeSwitcher />
      </Div>
      <CardHeader className="text-center pb-4">
        <CardDescription className="text-xs md:text-sm">
          {t('signInToAccess')}{' '}
          <Span className={`${theme.primaryColor} font-semibold`}>{theme.name}</Span>
        </CardDescription>
        {theme.showEzstartMessage && (
          <P variant={'description'} size={'xs'} className="hidden md:block">
            {t('oneAccountAllApps')}
          </P>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        <SignInForm
          appName={app}
          redirectUri={navigation.redirectUri}
          showOAuth
          oauthProviders={['google']}
          texts={{
            emailOrUsername: t('emailOrUsername'),
            emailOrUsernamePlaceholder: t('emailOrUsernamePlaceholder'),
            password: t('password'),
            passwordPlaceholder: t('passwordPlaceholder'),
            forgotPassword: tForgot('link'),
            submit: t('submit'),
            submitting: t('submitting'),
            required: tValidation('required'),
            minLength: tValidation('minLength', { min: '{min}' }),
            noRedirectUri: t('noRedirectUri'),
            fallbackError: tApiErrors('fallback'),
            twoFactorPrompt: tTwoFactor('loginPrompt'),
            twoFactorCodePlaceholder: tTwoFactor('codePlaceholder'),
            twoFactorVerify: tTwoFactor('loginVerify'),
            twoFactorVerifying: tTwoFactor('loginVerifying'),
            twoFactorBack: tTwoFactor('useBackupCode'),
            continueWithGoogle: tOAuth('continueWithGoogle'),
            orContinueWith: tOAuth('orContinueWith'),
          }}
        />

        <Div className="text-center">
          <P size={'xs'}>
            {t('noAccount')}{' '}
            <Link
              href={navigation.registerHref}
              className="text-muted-foreground hover:text-foreground font-medium underline-offset-4 hover:underline"
            >
              {t('register')}
            </Link>
          </P>
        </Div>
      </CardContent>
    </Card>
  )
}

export default function LoginPage() {
  const t = useTranslations('login')

  return (
    <Div className="flex flex-1 items-center justify-center px-2">
      <Suspense fallback={<Spinner variant="primary" size="lg" text={t('loading')} />}>
        <LoginContent />
      </Suspense>
    </Div>
  )
}
