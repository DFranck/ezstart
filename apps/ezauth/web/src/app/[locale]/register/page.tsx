'use client'

import React from 'react'
import { getAppTheme } from '@/config/app-themes'
import { SignUpForm } from '@ezstart/auth-sdk'
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
import { ThemeSwitcher } from '@ezstart/next-theme/components'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { useTranslations } from 'next-intl'

function RegisterContent() {
  const t = useTranslations('register')
  const tv = useTranslations('verifyEmail')
  const tApiErrors = useTranslations('apiErrors')
  const tOAuth = useTranslations('oauth')
  const searchParams = useSearchParams()
  const app = searchParams.get('app') || 'ezstart'
  const redirect_uri = searchParams.get('redirect_uri')
  const theme = getAppTheme(app)

  return (
    <Card
      className="max-w-md w-full relative"
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
      <Div className="absolute top-4 left-4">
        <BackButton />
      </Div>
      <Div className="absolute top-4 right-4">
        <ThemeSwitcher />
      </Div>
      <CardHeader className="text-center pb-4">
        <CardDescription className="text-xs md:text-sm">
          {t('createAccountToAccess')}{' '}
          <Span className={`${theme.primaryColor} font-medium`}>{theme.name}</Span>
        </CardDescription>
        {theme.showEzstartMessage && (
          <P variant={'description'} size={'xs'} className="hidden md:block">
            {t('oneAccountAllApps')}
          </P>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        <SignUpForm
          appName={app}
          redirectUri={redirect_uri || undefined}
          showOAuth
          oauthProviders={['google']}
          backToLoginHref={`/login?${searchParams.toString()}`}
          texts={{
            email: t('email'),
            emailPlaceholder: t('emailPlaceholder'),
            emailTaken: t('emailTaken'),
            username: t('username'),
            usernamePlaceholder: t('usernamePlaceholder'),
            usernameTaken: t('usernameTaken'),
            firstName: t('firstName'),
            firstNamePlaceholder: t('firstNamePlaceholder'),
            lastName: t('lastName'),
            lastNamePlaceholder: t('lastNamePlaceholder'),
            password: t('password'),
            passwordPlaceholder: t('passwordPlaceholder'),
            passwordHint: t('passwordHint'),
            confirmPassword: t('confirmPassword'),
            confirmPasswordPlaceholder: t('confirmPasswordPlaceholder'),
            passwordMismatch: t('passwordMismatch'),
            submit: t('submit'),
            submitting: t('submitting'),
            fallbackError: tApiErrors('fallback'),
            checkEmail: tv('checkEmail'),
            checkEmailDescription: tv('checkEmailDescription'),
            backToLogin: tv('backToLogin'),
            passwordWeak: t('passwordStrength.weak'),
            passwordFair: t('passwordStrength.fair'),
            passwordGood: t('passwordStrength.good'),
            passwordStrong: t('passwordStrength.strong'),
            continueWithGoogle: tOAuth('continueWithGoogle'),
            orContinueWith: tOAuth('orContinueWith'),
          }}
        />

        <Div className="text-center">
          <P size={'xs'}>
            {t('hasAccount')}{' '}
            <Link
              href={`/login?${searchParams.toString()}`}
              className={`${theme.primaryColor} hover:opacity-80 font-medium`}
            >
              {t('login')}
            </Link>
          </P>
        </Div>
      </CardContent>
    </Card>
  )
}

export default function RegisterPage() {
  const t = useTranslations('register')

  return (
    <Suspense fallback={<Spinner variant="primary" size="lg" text={t('loading')} />}>
      <RegisterContent />
    </Suspense>
  )
}
