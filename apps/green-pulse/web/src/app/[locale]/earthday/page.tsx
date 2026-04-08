'use client'

import { QuickSignUpForm, SignedIn, SignedOut } from '@ezstart/auth-sdk'
import {
  Button,
  Card,
  CardContent,
  Div,
  H2,
  Icon,
  type KnownIconName,
  LandingHero,
  P,
  PWAInstallPrompt,
  Section,
  Span,
} from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'

const VALUE_PROPS: { icon: KnownIconName; key: 'assessment' | 'roadmap' | 'reporting' }[] = [
  { icon: 'lucide:Bot', key: 'assessment' },
  { icon: 'lucide:Route', key: 'roadmap' },
  { icon: 'lucide:FileBarChart', key: 'reporting' },
]

function EarthDayContent() {
  const t = useTranslations('earthday')
  const searchParams = useSearchParams()
  const [signupSuccess, setSignupSuccess] = useState(false)

  useEffect(() => {
    const promo = searchParams.get('promo')
    const utmSource = searchParams.get('utm_source')

    if (promo) {
      localStorage.setItem('gp_promo_code', promo)
    }
    if (utmSource) {
      localStorage.setItem('gp_utm_source', utmSource)
    }
  }, [searchParams])

  const [hasPromo, setHasPromo] = useState(false)

  useEffect(() => {
    const fromUrl = searchParams.get('promo') === 'EARTHDAY2026'
    const fromStorage = localStorage.getItem('gp_promo_code') === 'EARTHDAY2026'
    setHasPromo(fromUrl || fromStorage)
  }, [searchParams])

  return (
    <>
      {/* Hero */}
      <LandingHero
        bgMode="fixed"
        variant="full"
        title={t('hero.title')}
        description={t('hero.subtitle')}
        className="bg-cover bg-center text-white"
        style={{ backgroundImage: "url('/images/earthday-hero.jpg')" }}
      >
        {/* Logo */}
        <Div className="flex justify-center mb-6">
          <Image
            src="/logo_complet_light.svg"
            alt="GreenPulse.AI"
            width={280}
            height={56}
            className="dark:hidden"
            priority
          />
          <Image
            src="/logo_complet_dark.svg"
            alt="GreenPulse.AI"
            width={280}
            height={56}
            className="hidden dark:block"
            priority
          />
        </Div>

        {/* GLC co-branding */}
        <Div className="flex items-center justify-center gap-2 mb-4">
          <Icon name="lucide:Leaf" size={18} className="text-gp-primary" />
          <Span className="text-sm text-white/70">{t('header.cobranding')}</Span>
        </Div>

        {/* Promo code — big & prominent */}
        <Div className="rounded-2xl bg-gp-primary/20 backdrop-blur-md border-2 border-gp-primary/50 p-6 text-center max-w-lg mx-auto">
          <Div className="flex items-center justify-center gap-3 mb-2">
            <Icon name="lucide:Gift" size={24} className="text-gp-primary" />
            <Span className="text-lg font-bold text-gp-primary uppercase tracking-wider">
              {t('cta.promo.label')}
            </Span>
          </Div>
          <P className="text-base text-white font-medium">
            {hasPromo ? t('cta.promo.applied') : t('cta.promo.default')}
          </P>
        </Div>
      </LandingHero>

      {/* Auth section: QuickSignUp or Welcome */}
      <Section size="full" className="">
        <SignedOut>
          <Card variant="floating" className="overflow-hidden">
            {/* Promo banner */}
            {hasPromo && (
              <Div className="bg-brand/10 border-b border-brand/20 px-4 py-3 text-center">
                <Div className="flex items-center justify-center gap-2">
                  <Icon name="lucide:Gift" size={16} className="text-brand" />
                  <Span className="text-sm font-semibold text-brand">{t('cta.promo.applied')}</Span>
                </Div>
              </Div>
            )}
            <CardContent className="p-6 sm:p-8">
              <Div className="text-center mb-6">
                <Icon name="lucide:UserPlus" size={32} className="text-brand mx-auto mb-3" />
                <H2 className="text-xl font-bold text-foreground">{t('signup.title')}</H2>
                <P className="text-sm text-muted-foreground mt-1">{t('signup.subtitle')}</P>
              </Div>
              <QuickSignUpForm
                appName="green-pulse"
                promoCode={hasPromo ? 'EARTHDAY2026' : undefined}
                onSuccess={() => setSignupSuccess(true)}
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
            </CardContent>
          </Card>
        </SignedOut>

        <SignedIn>
          <Card variant="floating" className="overflow-hidden">
            <CardContent className="p-6 sm:p-8 text-center">
              <Icon name="lucide:PartyPopper" size={40} className="text-primary mx-auto mb-4" />
              <H2 className="text-xl font-bold text-foreground mb-2">
                {signupSuccess ? t('welcome.justJoined') : t('welcome.back')}
              </H2>
              <P className="text-sm text-muted-foreground mb-6">{t('welcome.installHint')}</P>

              <Div className="flex flex-col gap-3">
                <PWAInstallPrompt
                  appName="GreenPulse.AI"
                  description={t('welcome.installDescription')}
                  installButtonText={t('welcome.installButton')}
                  laterButtonText={t('welcome.laterButton')}
                />

                <Link href="/chat" className="block">
                  <Button
                    size="lg"
                    className="w-full text-base font-semibold py-6 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20"
                  >
                    {t('cta.start')}
                    <Icon name="lucide:ArrowRight" size={20} className="ml-2" />
                  </Button>
                </Link>
              </Div>
            </CardContent>
          </Card>
        </SignedIn>
      </Section>

      {/* Value Props */}
      <Section className="max-w-2xl mx-auto px-4 pb-8">
        <Div className="grid gap-4">
          {VALUE_PROPS.map(({ icon, key }) => (
            <Card key={key} variant="default" className="border-border/50">
              <CardContent className="flex items-start gap-4 p-4 sm:p-5">
                <Div className="shrink-0 w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Icon name={icon} size={22} className="text-primary" />
                </Div>
                <Div className="flex flex-col gap-1">
                  <H2 className="text-base font-semibold text-foreground">
                    {t(`valueProps.${key}.title`)}
                  </H2>
                  <P className="text-sm text-muted-foreground leading-relaxed">
                    {t(`valueProps.${key}.description`)}
                  </P>
                </Div>
              </CardContent>
            </Card>
          ))}
        </Div>
      </Section>

      {/* Footer */}
      <Div className="w-full border-t border-border/40 bg-muted/30">
        <Div className="max-w-2xl mx-auto px-4 py-6 flex flex-col items-center gap-3 text-center">
          <P className="text-xs text-muted-foreground leading-relaxed">{t('footer.eventCredit')}</P>
          <Div className="h-px w-12 bg-border" />
          <P className="text-xs text-muted-foreground">{t('footer.poweredBy')}</P>
          <Link
            href="mailto:contact@ai-greenpulse.com"
            className="text-xs text-primary hover:underline"
          >
            contact@ai-greenpulse.com
          </Link>
        </Div>
      </Div>
    </>
  )
}

export default function EarthDayPage() {
  return (
    <Suspense>
      <EarthDayContent />
    </Suspense>
  )
}
