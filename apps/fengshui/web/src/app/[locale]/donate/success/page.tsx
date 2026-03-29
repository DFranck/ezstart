'use client'

import { getGradientWithOpacity, GRADIENT_TEXT } from '@/lib/theme-colors'
import { logger } from '@ezstart/logger'
import { Button, H1, Icon, P, Section } from '@ezstart/ui/components'
import { callApi } from '@ezstart/fetch-client'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function DonateSuccessPage(): any {
  const t = useTranslations('donate')
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const [verified, setVerified] = useState(false)

  useEffect(() => {
    if (sessionId && !verified) {
      callApi(`/verify-payment/${sessionId}`, {
        appName: 'ezpay',
        method: 'POST',
      })
        .then(response => {
          if (response.ok && response.data?.success) {
            setVerified(true)
          }
        })
        .catch(err => logger.error('Failed to verify payment:', err))
    }
  }, [sessionId, verified])

  return (
    <Section size={'full'} className="relative pt-24 md:pt-32">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        {/* Gradient animé */}
        <div className="absolute inset-0 animate-pulse" style={getGradientWithOpacity(20, 'br')} />
        <div
          className="absolute inset-0 animate-pulse"
          style={{ ...getGradientWithOpacity(20, 'tr'), animationDelay: '1s' }}
        />
      </div>

      <div className="max-w-2xl mx-auto text-center">
        {/* Success Icon */}
        <div className="mb-12 flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 animate-ping opacity-75">
              <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-pink-500 to-rose-500" />
            </div>
            <div className="relative w-24 h-24 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center shadow-2xl">
              <Icon name="lucide:Heart" className="w-12 h-12 md:w-16 md:h-16 text-white" />
            </div>
          </div>
        </div>

        {/* Title */}
        <H1 className="text-4xl md:text-6xl font-bold mb-6">
          <span className={`bg-gradient-to-r ${GRADIENT_TEXT}`}>{t('successTitle')}</span>
        </H1>

        {/* Message */}
        <P className="text-xl text-muted-foreground mb-12">{t('successMessage')}</P>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
          <Button
            asChild
            size="lg"
            className="bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600"
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
        </div>

        {/* Info Box */}
        <div className="p-8 bg-muted/50 backdrop-blur-sm rounded-2xl text-left border border-border">
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <Icon name="lucide:Sparkles" className="w-5 h-5 text-pink-500" />
            {t('whatNext')}
          </h3>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li className="flex items-start gap-3">
              <Icon name="lucide:Mail" className="w-5 h-5 mt-0.5 text-blue-500 flex-shrink-0" />
              <span>{t('emailConfirmation')}</span>
            </li>
            <li className="flex items-start gap-3">
              <Icon name="lucide:Heart" className="w-5 h-5 mt-0.5 text-pink-500 flex-shrink-0" />
              <span>{t('supporterWall')}</span>
            </li>
            <li className="flex items-start gap-3">
              <Icon name="lucide:Rocket" className="w-5 h-5 mt-0.5 text-purple-500 flex-shrink-0" />
              <span>{t('projectImprovement')}</span>
            </li>
          </ul>
        </div>
      </div>
    </Section>
  )
}
