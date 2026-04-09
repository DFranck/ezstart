'use client'

import { QuickSignUpForm, SignedIn, SignedOut, SignInForm } from '@ezstart/auth-sdk'
import {
  Button,
  Card,
  CardContent,
  Div,
  H1,
  H2,
  Icon,
  LocaleSwitcher,
  P,
  PWAInstallPrompt,
} from '@ezstart/ui/components'
import { useLocale, useTranslations } from 'next-intl'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import { routing } from '../../../i18n/routing'

function EarthDayContent() {
  const t = useTranslations('earthday')
  const searchParams = useSearchParams()
  const currentLocale = useLocale()
  const router = useRouter()
  const [signupSuccess, setSignupSuccess] = useState(false)
  const [signupPromo, setSignupPromo] = useState<string | null>(null)
  const [mode, setMode] = useState<'signup' | 'signin'>('signup')
  const hasPromo = Boolean(searchParams.get('promo'))

  // Track utm_source for analytics
  useEffect(() => {
    const utmSource = searchParams.get('utm_source')
    if (utmSource) {
      localStorage.setItem('gp_utm_source', utmSource)
    }
  }, [searchParams])

  return (
    <Div
      className="fixed inset-0 flex flex-col items-center justify-center bg-cover bg-center bg-no-repeat px-4"
      style={{ backgroundImage: "url('/images/earthday-hero.jpg')" }}
    >
      {/* Locale switcher */}
      <Div className="absolute top-4 right-4 z-20">
        <LocaleSwitcher
          locales={[...routing.locales]}
          currentLocale={currentLocale}
          onLocaleChange={locale => {
            const params = searchParams.toString()
            router.push(`/${locale}/earthday${params ? `?${params}` : ''}`)
          }}
        />
      </Div>

      {/* Dark overlay */}
      <Div className="absolute inset-0 bg-black/40" />

      {/* Content */}
      <Div className="relative z-10 flex flex-col items-center w-full">
        {/* Logo */}
        <Div className="mb-4">
          <Image
            src="/logo_complet_dark.svg"
            alt="GreenPulse.AI"
            width={200}
            height={40}
            priority
          />
        </Div>

        {/* Title */}
        <H1 className="text-xl sm:text-3xl font-bold text-white text-center mb-1 max-w-lg">
          {t('hero.title')}
        </H1>
        <P className="text-sm text-white/70 text-center mb-6">{t('hero.subtitle')}</P>

        {/* Auth */}
        <Div className="w-full max-w-sm">
          <SignedOut>
            <Card variant="floating" className="bg-background/90 backdrop-blur-md border-white/10">
              <CardContent className="p-5">
                {mode === 'signup' ? (
                  <>
                    <QuickSignUpForm
                      appName="green-pulse"
                      density="compact"
                      description={t('signup.description')}
                      onSuccess={() => {
                        setSignupSuccess(true)
                        if (hasPromo) setSignupPromo(searchParams.get('promo'))
                      }}
                      texts={{
                        username: t('signup.username'),
                        usernamePlaceholder: t('signup.usernamePlaceholder'),
                        email: t('signup.email'),
                        emailPlaceholder: t('signup.emailPlaceholder'),
                        submit: t('signup.submit'),
                        submitting: t('signup.submitting'),
                        successToast: t('signup.successToast'),
                        fallbackError: t('signup.fallbackError'),
                        required: t('signup.required'),
                        invalidEmail: t('signup.invalidEmail'),
                      }}
                    />
                    <P className="text-xs text-center text-muted-foreground mt-4">
                      {t('auth.hasAccount')}{' '}
                      <Button
                        variant="link"
                        size="sm"
                        className="p-0 h-auto text-xs"
                        onClick={() => setMode('signin')}
                      >
                        {t('auth.signIn')}
                      </Button>
                    </P>
                  </>
                ) : (
                  <>
                    <SignInForm appName="green-pulse" onSuccess={() => setSignupSuccess(false)} />
                    <P className="text-xs text-center text-muted-foreground mt-4">
                      {t('auth.noAccount')}{' '}
                      <Button
                        variant="link"
                        size="sm"
                        className="p-0 h-auto text-xs"
                        onClick={() => setMode('signup')}
                      >
                        {t('auth.signUp')}
                      </Button>
                    </P>
                  </>
                )}
              </CardContent>
            </Card>
          </SignedOut>

          <SignedIn>
            <Card variant="floating" className="bg-background/90 backdrop-blur-md border-white/10">
              <CardContent className="p-5 text-center">
                <Icon name="lucide:PartyPopper" size={36} className="text-primary mx-auto mb-3" />
                <H2 className="text-lg font-bold text-foreground mb-2">
                  {signupSuccess ? t('welcome.justJoined') : t('welcome.back')}
                </H2>
                {signupPromo ? (
                  <P className="text-sm text-green-400 mb-4">{t('welcome.promoApplied')}</P>
                ) : (
                  <P className="text-sm text-muted-foreground mb-4">{t('welcome.installHint')}</P>
                )}

                <PWAInstallPrompt
                  installButtonText={t('welcome.installButton')}
                  hideTitle
                  hideDescription
                  hideLater
                  inline
                  showInDev
                  fallback={
                    <Link href="/chat" className="block">
                      <Button
                        size="lg"
                        className="w-full text-base font-semibold py-5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
                      >
                        {t('cta.start')}
                        <Icon name="lucide:ArrowRight" size={20} className="ml-2" />
                      </Button>
                    </Link>
                  }
                />
              </CardContent>
            </Card>
          </SignedIn>
        </Div>
      </Div>
    </Div>
  )
}

export default function EarthDayPage() {
  return (
    <Suspense>
      <EarthDayContent />
    </Suspense>
  )
}
