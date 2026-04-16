'use client'

import { getAppTheme } from '@/config/app-themes'
import { SignUpForm, useAuthNavigation } from '@ezstart/auth-sdk'
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
import { ThemeSwitcher } from '@ezstart/ui/theme/components'
import Link from 'next/link'
import { Suspense } from 'react'
import { useTranslations } from 'next-intl'

function RegisterContent() {
  const t = useTranslations('register')
  const tv = useTranslations('verifyEmail')
  const tApiErrors = useTranslations('apiErrors')
  const tOAuth = useTranslations('oauth')
  const tPwd = useTranslations('passwordStrength')
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
          redirectUri={navigation.redirectUri}
          showOAuth
          oauthProviders={['google']}
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
            passwordWeak: tPwd('weak'),
            passwordFair: tPwd('fair'),
            passwordGood: tPwd('good'),
            passwordStrong: tPwd('strong'),
            continueWithGoogle: tOAuth('continueWithGoogle'),
            orContinueWith: tOAuth('orContinueWith'),
          }}
        />

        <Div className="text-center">
          <P size={'xs'}>
            {t('hasAccount')}{' '}
            <Link
              href={navigation.loginHref}
              className="text-muted-foreground hover:text-foreground font-medium underline-offset-4 hover:underline"
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
