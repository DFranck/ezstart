'use client'

import { Button, Div, H2, P, Section } from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { ContactButton } from './contact-button'

export function CtaSection() {
  const t = useTranslations('home')

  return (
    <Section size={'xl'} className="max-w-full t">
      <Div className="container mx-auto text-center">
        <Div className="max-w-3xl mx-auto">
          <H2 className="text-3xl lg:text-4xl font-bold mb-6">{t('cta.title')}</H2>
          <P className="text-xl mb-8">{t('cta.description')}</P>
          <Div layout={'grid'} className="gap-4">
            <ContactButton
              topic="discuss"
              size="lg"
              className="bg-gp-primary hover:bg-gp-primary/80 text-lg px-8 py-6"
            >
              {t('cta.discuss')}
            </ContactButton>
            <Button asChild size="lg" variant="outline" className="text-lg px-8 py-6">
              <Link href="/chat" target="_blank" rel="noopener noreferrer">
                {t('cta.getStarted')}
              </Link>
            </Button>
          </Div>
        </Div>
      </Div>
    </Section>
  )
}
