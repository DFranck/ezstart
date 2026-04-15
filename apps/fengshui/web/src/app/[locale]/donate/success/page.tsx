'use client'

import { getGradientWithOpacity, GRADIENT_TEXT } from '@/lib/theme-colors'
import { logger } from '@ezstart/logger'
import { Button, Div, H1, H3, Icon, LI, P, Section, Span, UL } from '@ezstart/ui/components'
import { apiCall } from '@ezstart/api-sdk'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function DonateSuccessPage() {
  const t = useTranslations('donate')
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const [verified, setVerified] = useState(false)

  useEffect(() => {
    if (sessionId && !verified) {
      apiCall<{ success?: boolean } | null>(`/verify-payment/${sessionId}`, {
        appName: 'ezpay',
        method: 'POST',
      })
        .then(data => {
          if (data?.success) {
            setVerified(true)
          }
        })
        .catch(err => logger.error('Failed to verify payment:', err))
    }
  }, [sessionId, verified])

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
        {/* Success Icon */}
        <Div className="mb-12 flex justify-center">
          <Div className="relative">
            <Div className="absolute inset-0 animate-ping opacity-75">
              <Div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-primary to-accent" />
            </Div>
            <Div className="relative w-24 h-24 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-2xl">
              <Icon name="lucide:Heart" className="w-12 h-12 md:w-16 md:h-16 text-white" />
            </Div>
          </Div>
        </Div>

        {/* Title */}
        <H1 className="text-4xl md:text-6xl font-bold mb-6">
          <Span className={`bg-gradient-to-r ${GRADIENT_TEXT}`}>{t('successTitle')}</Span>
        </H1>

        {/* Message */}
        <P className="text-xl text-muted-foreground mb-12">{t('successMessage')}</P>

        {/* Actions */}
        <Div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
          <Button
            asChild
            size="lg"
            className="bg-gradient-to-r from-primary to-accent hover:from-pink-600 hover:to-rose-600"
          >
            <Link href="/">
              <Icon name="lucide:Home" className="w-5 h-5 mr-2" />
              {t('backHome')}
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/donate">
              <Icon name="lucide:Users" className="w-5 h-5 mr-2" />
              {t('viewSupporters')}
            </Link>
          </Button>
        </Div>

        {/* Info Box */}
        <Div className="p-8 bg-muted/50 backdrop-blur-sm rounded-2xl text-left border border-border">
          <H3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <Icon name="lucide:Sparkles" className="w-5 h-5 text-primary" />
            {t('whatNext')}
          </H3>
          <UL className="space-y-3 text-sm text-muted-foreground">
            <LI className="flex items-start gap-3">
              <Icon name="lucide:Mail" className="w-5 h-5 mt-0.5 text-primary flex-shrink-0" />
              <Span>{t('emailConfirmation')}</Span>
            </LI>
            <LI className="flex items-start gap-3">
              <Icon name="lucide:Heart" className="w-5 h-5 mt-0.5 text-primary flex-shrink-0" />
              <Span>{t('supporterWall')}</Span>
            </LI>
            <LI className="flex items-start gap-3">
              <Icon name="lucide:Rocket" className="w-5 h-5 mt-0.5 text-accent flex-shrink-0" />
              <Span>{t('projectImprovement')}</Span>
            </LI>
          </UL>
        </Div>
      </Div>
    </Section>
  )
}
