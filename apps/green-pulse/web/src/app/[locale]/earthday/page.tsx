'use client'

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
  Section,
  Span,
} from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect } from 'react'

const VALUE_PROPS: { icon: KnownIconName; key: 'assessment' | 'roadmap' | 'reporting' }[] = [
  { icon: 'lucide:Bot', key: 'assessment' },
  { icon: 'lucide:Route', key: 'roadmap' },
  { icon: 'lucide:FileBarChart', key: 'reporting' },
]

function EarthDayContent() {
  const t = useTranslations('earthday')
  const searchParams = useSearchParams()

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

      {/* Hero */}
      <Section className="max-w-2xl mx-auto px-4 pt-8 pb-6">
        <Div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 p-6 sm:p-8">
          <Div
            className="absolute inset-0 bg-gradient-to-tr from-primary/5 to-transparent opacity-60"
            aria-hidden="true"
          />
          <Div className="relative z-10 flex flex-col items-center text-center gap-4">
            <Div className="w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center">
              <Icon name="lucide:Leaf" size={28} className="text-primary" />
            </Div>
            <H1 className="text-2xl sm:text-3xl font-bold leading-tight text-foreground">
              {t('hero.title')}
            </H1>
            <P className="text-base text-muted-foreground max-w-md">{t('hero.subtitle')}</P>
          </Div>
        </Div>
      </Section>

      {/* Value Props */}
      <Section className="max-w-2xl mx-auto px-4 pb-6">
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

      {/* Promo Badge */}
      <Section className="max-w-2xl mx-auto px-4 pb-4">
        <Div className="rounded-xl bg-primary/5 border border-primary/20 p-4 text-center">
          <Div className="flex items-center justify-center gap-2 mb-1">
            <Icon name="lucide:Gift" size={16} className="text-primary" />
            <Span className="text-xs font-semibold text-primary uppercase tracking-wide">
              {t('cta.promo.label')}
            </Span>
          </Div>
          <P className="text-sm text-muted-foreground">
            {hasPromo ? t('cta.promo.applied') : t('cta.promo.default')}
          </P>
        </Div>
      </Section>

      {/* CTA */}
      <Section className="max-w-2xl mx-auto px-4 pb-10">
        <Link href="/chat" className="block">
          <Button
            size="lg"
            className="w-full text-base font-semibold py-6 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20"
          >
            {t('cta.start')}
            <Icon name="lucide:ArrowRight" size={20} className="ml-2" />
          </Button>
        </Link>
      </Section>

      {/* Footer */}
      <Div className="w-full border-t border-border/40 bg-muted/30">
        <Div className="max-w-2xl mx-auto px-4 py-6 flex flex-col items-center gap-3 text-center">
          <P className="text-xs text-muted-foreground leading-relaxed">
            {t('footer.eventCredit')}
          </P>
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
