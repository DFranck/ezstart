'use client'

import { Badge, Button, Div, H1, H2, P, Section, Span } from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import { Link } from '@/i18n/navigation'
import { useEffect, useState } from 'react'

export function HeroSection() {
  const t = useTranslations('home')
  const [showSubtitle, setShowSubtitle] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSubtitle(true)
    }, 500)
    return () => clearTimeout(timer)
  }, [])

  return (
    <Section size={'full'} className={'t'}>
      <Div layout={'row'}>
        <Image
          src="/logo_complet_light.svg"
          alt="GreenPulse.AI Logo"
          width={300}
          height={60}
          className="animate-glow-pulse dark:hidden"
        />
        <Image
          src="/logo_complet_dark.svg"
          alt="GreenPulse.AI Logo"
          width={300}
          height={60}
          className="animate-glow-pulse hidden dark:block"
        />
      </Div>
      <H1 className="sr-only">{t('hero.title')}</H1>
      <Div layout={'center'} className="gap-6">
        <H2
          size={'h3'}
          className={`transition-all duration-1000 ${
            showSubtitle ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          {t('hero.subtitle')
            .split(' ')
            .map((word, index) => (
              <Span
                key={`word-${index}-${word}`}
                className="inline-block"
                style={{
                  animation: showSubtitle
                    ? `fadeInWord 0.4s ease-out ${index * 0.15}s forwards`
                    : 'none',
                  opacity: showSubtitle ? 1 : 0,
                }}
              >
                {word}
                {index < t('hero.subtitle').split(' ').length - 1 ? '\u00A0' : ''}
              </Span>
            ))}
        </H2>
        <style jsx>{`
          @keyframes fadeInWord {
            from {
              opacity: 0;
              transform: translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>

        <Div layout={'row'} className="hidden lg:flex flex-wrap justify-center gap-2">
          {(Array.isArray(t.raw('heroFeatures')) ? t.raw('heroFeatures') : []).map(
            (feature: string, index: number) => (
              <Badge key={index} size="lg" className="bg-gp-accent text-gp-accent-foreground">
                {feature}
              </Badge>
            )
          )}
        </Div>

        <P className="text-base text-center text-foreground font-medium max-w-4xl">
          {t('hero.description')}
        </P>
      </Div>

      <Div layout={'grid'} className="gap-4">
        <Button
          asChild
          size="lg"
          className="bg-gp-primary hover:bg-gp-primary/80 text-lg px-8 py-6"
        >
          <Link href="/chat" target="_blank" rel="noopener noreferrer">
            {t('hero.getStarted')}
          </Link>
        </Button>
        <Button
          asChild
          size="lg"
          variant="outline"
          className="bg-muted hover:bg-muted/80 border-foreground border text-foreground font-bold text-xl px-8 py-6"
        >
          <Link href="#partnership">
            {t('hero.ctaSecondary')} <Span className="ml-1">→</Span>
          </Link>
        </Button>
      </Div>
    </Section>
  )
}
