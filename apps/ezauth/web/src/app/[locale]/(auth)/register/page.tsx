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
import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useKeyConfig } from '@/hooks/useKeyConfig'
import { useDynamicAppTheme } from '@/hooks/useDynamicAppTheme'

function RegisterContent() {
  const t = useTranslations('register')
  const tv = useTranslations('verifyEmail')
  const tApiErrors = useTranslations('apiErrors')
  const tOAuth = useTranslations('oauth')
  const tPwd = useTranslations('passwordStrength')
  const navigation = useAuthNavigation()
  const params = useParams<{ locale: string }>()
  const locale = params?.locale ?? 'en'

  // Resolve app from ?key= (publishable key) or fallback to ?app= (legacy)
  const keyConfig = useKeyConfig(navigation.publishableKey)
  const app = keyConfig.appName ?? navigation.app ?? 'ezauth'
  const theme = getAppTheme(app)
  const isKeyInvalid = keyConfig.status === 'invalid'

  // Sync <html data-app="..."> on the client so the per-app theme CSS kicks
  // in (middleware only sets the SSR header for `?app=` legacy, not `?key=`).
  useDynamicAppTheme(app)
  // First-party fallback: default redirect_uri to ezauth's own callback page
  // when the user lands on /register directly (no third-party ?redirect_uri=).
  const resolvedRedirectUri =
    navigation.redirectUri ??
    (typeof window !== 'undefined'
      ? `${window.location.origin}/${locale}/auth/callback`
      : undefined)
  const bannerKeyStatus = navigation.publishableKey
    ? keyConfig.status === 'valid'
      ? ('valid' as const)
      : keyConfig.status === 'invalid'
        ? ('invalid' as const)
        : undefined
    : undefined

  return (
    <Card className="max-w-md w-full relative max-h-[90vh] overflow-y-auto" data-app={app}>
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
      </CardHeader>

      <CardContent className="space-y-4">
        <SignUpForm
          appName={app}
          redirectUri={resolvedRedirectUri}
          showOAuth
          oauthProviders={['google']}
          disabled={isKeyInvalid}
          keyStatus={bannerKeyStatus}
          urlKey={navigation.publishableKey}
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
    <Div className="flex flex-1 items-center justify-center px-2">
      <Suspense fallback={<Spinner variant="primary" size="lg" text={t('loading')} />}>
        <RegisterContent />
      </Suspense>
    </Div>
  )
}
