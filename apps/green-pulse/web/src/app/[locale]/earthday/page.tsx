'use client'

import { QuickSignUpForm, SignedOut, SignInForm, useAuth } from '@ezstart/auth-sdk'
import { Button, Card, CardContent, Div, H1, LocaleSwitcher, P } from '@ezstart/ui/components'
import { useLocale, useTranslations } from 'next-intl'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import { toast } from '@ezstart/ui/utils'
import { routing } from '../../../i18n/routing'

function EarthDayContent() {
  const t = useTranslations('earthday')
  const searchParams = useSearchParams()
  const currentLocale = useLocale()
  const router = useRouter()
  const { isAuthenticated } = useAuth()
  const [mode, setMode] = useState<'signup' | 'signin'>('signup')

  // Redirect authenticated users to chat
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/chat')
    }
  }, [isAuthenticated, router])

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
                        const promo = searchParams.get('promo')
                        if (promo) {
                          toast.success(t('welcome.promoApplied'))
                        }
                        router.push('/chat')
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
                    <SignInForm appName="green-pulse" onSuccess={() => router.push('/chat')} />
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
