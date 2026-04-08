'use client'

import { QuickSignUpForm, SignedIn, SignedOut } from '@ezstart/auth-sdk'
import {
  Button,
  Card,
  CardContent,
  Div,
  H1,
  H2,
  Icon,
  type KnownIconName,
  P,
  PWAInstallPrompt,
  Section,
  Span,
  LandingHero,
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

  const hasPromo =
    typeof window !== 'undefined'
      ? localStorage.getItem('gp_promo_code') === 'EARTHDAY2026' ||
        searchParams.get('promo') === 'EARTHDAY2026'
      : searchParams.get('promo') === 'EARTHDAY2026'

  return (
    <Div className="min-h-screen bg-background">
      {/* Header */}
      <Div className="w-full border-b border-border/40 bg-card/50 backdrop-blur-sm">
        <Div className="max-w-2xl mx-auto px-4 py-4 flex flex-col items-center gap-3">
          <Div layout="row" className="gap-3 items-center">
            <Image
              src="/logo_complet_light.svg"
              alt="GreenPulse.AI"
              width={180}
              height={36}
              className="dark:hidden"
              priority
            />
            <Image
              src="/logo_complet_dark.svg"
              alt="GreenPulse.AI"
              width={180}
              height={36}
              className="hidden dark:block"
              priority
            />
          </Div>
          <P className="text-xs text-muted-foreground text-center leading-relaxed">
            {t('header.cobranding')}
          </P>
        </Div>
      </Div>

      {/* Hero with background image */}
      <LandingHero
        variant="fullHeight"
        title={t('hero.title')}
        description={t('hero.subtitle')}
        badge={t('header.cobranding')}
        className="bg-cover bg-center text-white"
        style={{ backgroundImage: "url('/images/earthday-hero.jpg')" }}
      >
        {/* Dark overlay */}
        <Div className="absolute inset-0 bg-black/50 -z-[1]" />

        {/* Promo code */}
        <Div className="rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 p-4 text-center max-w-md mx-auto">
          <Div className="flex items-center justify-center gap-2 mb-1">
            <Icon name="lucide:Gift" size={16} className="text-primary" />
            <Span className="text-xs font-semibold text-primary uppercase tracking-wide">
              {t('cta.promo.label')}
            </Span>
          </Div>
          <P className="text-sm text-white/80">
            {hasPromo ? t('cta.promo.applied') : t('cta.promo.default')}
          </P>
        </Div>
      </LandingHero>

      {/* Value Props */}
      <Section className="max-w-2xl mx-auto px-4 py-8">
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

      {/* Auth section: QuickSignUp or Welcome */}
      <Section className="max-w-2xl mx-auto px-4 pb-8">
        <SignedOut>
          <Card variant="floating" className="overflow-hidden">
            <CardContent className="p-6 sm:p-8">
              <Div className="text-center mb-6">
                <Icon name="lucide:UserPlus" size={32} className="text-primary mx-auto mb-3" />
                <H2 className="text-xl font-bold text-foreground">{t('signup.title')}</H2>
                <P className="text-sm text-muted-foreground mt-1">{t('signup.subtitle')}</P>
              </Div>
              <QuickSignUpForm
                appName="green-pulse"
                onSuccess={() => setSignupSuccess(true)}
                texts={{
                  username: t('signup.username'),
                  usernamePlaceholder: t('signup.usernamePlaceholder'),
                  email: t('signup.email'),
                  emailPlaceholder: t('signup.emailPlaceholder'),
                  submit: t('signup.submit'),
                  submitting: t('signup.submitting'),
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
