'use client'

import { getGradientWithOpacity, GRADIENT_TEXT } from '@/lib/theme-colors'
import { Button, Div, H1, H3, Icon, LI, P, Section, Span, UL } from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'
import Link from 'next/link'

export default function DonateCancelPage(): any {
  const t = useTranslations('donate')

  return (
    <Section size={'full'} className="relative pt-24 md:pt-32">
      <Div className="absolute inset-0 -z-10 overflow-hidden">
        {/* Gradient animé */}
        <Div className="absolute inset-0 animate-pulse" style={getGradientWithOpacity(20, 'br')} />
        <Div
          className="absolute inset-0 animate-pulse"
          style={{ ...getGradientWithOpacity(20, 'tr'), animationDelay: '1s' }}
        />
      </Div>

      <Div className="max-w-2xl mx-auto text-center">
        {/* Cancel Icon */}
        <Div className="mb-12 flex justify-center">
          <Div className="relative">
            <Div className="absolute inset-0 animate-pulse opacity-50">
              <Div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-muted" />
            </Div>
            <Div className="relative w-24 h-24 md:w-32 md:h-32 rounded-full bg-muted flex items-center justify-center shadow-xl">
              <Icon
                name="lucide:XCircle"
                className="w-12 h-12 md:w-16 md:h-16 text-muted-foreground"
              />
            </Div>
          </Div>
        </Div>

        {/* Title */}
        <H1 className="text-4xl md:text-6xl font-bold mb-6">
          <Span className={`bg-gradient-to-r ${GRADIENT_TEXT}`}>{t('cancelTitle')}</Span>
        </H1>

        {/* Message */}
        <P className="text-xl text-muted-foreground mb-12">{t('cancelMessage')}</P>

        {/* Actions */}
        <Div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
          <Button
            asChild
            size="lg"
            className="bg-gradient-to-r from-primary to-accent hover:from-pink-600 hover:to-rose-600"
          >
            <Link href="/donate">
              <Icon name="lucide:Heart" className="w-5 h-5 mr-2" />
              {t('tryAgain')}
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/">
              <Icon name="lucide:Home" className="w-5 h-5 mr-2" />
              {t('backHome')}
            </Link>
          </Button>
        </Div>

        {/* Info Box */}
        <Div className="p-8 bg-muted/50 backdrop-blur-sm rounded-2xl text-left border border-border">
          <H3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <Icon name="lucide:Heart" className="w-5 h-5 text-primary" />
            {t('stillSupport')}
          </H3>
          <UL className="space-y-3 text-sm text-muted-foreground">
            <LI className="flex items-start gap-3">
              <Icon name="lucide:Sparkles" className="w-5 h-5 mt-0.5 text-accent flex-shrink-0" />
              <Span>{t('keepFree')}</Span>
            </LI>
            <LI className="flex items-start gap-3">
              <Icon name="lucide:Users" className="w-5 h-5 mt-0.5 text-primary flex-shrink-0" />
              <Span>{t('joinCommunity')}</Span>
            </LI>
            <LI className="flex items-start gap-3">
              <Icon name="lucide:Share2" className="w-5 h-5 mt-0.5 text-success flex-shrink-0" />
              <Span>{t('shareProject')}</Span>
            </LI>
          </UL>
        </Div>
      </Div>
    </Section>
  )
}
