'use client'

import { getGradientWithOpacity, GRADIENT_TEXT } from '@/lib/theme-colors'
import { useAuth } from '@ezstart/auth-sdk'
import { DonateModal, DonationWall } from '@ezstart/pay-sdk'
import { Div, H1, H2, P, Section, Span } from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'

export default function DonatePage() {
  const { user } = useAuth()
  const t = useTranslations('donate')

  return (
    <Section size={'full'} className="relative">
      <Div className="absolute inset-0 -z-10 overflow-hidden">
        {/* Gradient animé */}
        <Div className="absolute inset-0 animate-pulse" style={getGradientWithOpacity(20, 'br')} />
        <Div
          className="absolute inset-0 animate-pulse"
          style={{ ...getGradientWithOpacity(20, 'tr'), animationDelay: '1s' }}
        />
      </Div>
      <Div className="max-w-4xl mx-auto pt-20">
        {/* Header */}
        <Div className="text-center mb-12">
          <H1 className="text-5xl md:text-7xl font-bold mb-6">
            <Span className={`bg-gradient-to-r ${GRADIENT_TEXT}`}>{t('pageTitle')}</Span>
          </H1>
          <P className="text-xl text-muted-foreground">{t('pageDescription')}</P>
        </Div>

        {/* Donate Button */}
        <Div className="flex justify-center mb-16">
          <DonateModal
            projectId="fengshui"
            projectName="Feng Shui Bagua"
            amounts={[5, 10]}
            userId={user?._id}
            userEmail={user?.email}
            userName={user?.username}
            texts={{
              title: t('title', { projectName: 'Feng Shui Bagua' }),
              description: t('description'),
              amountLabel: t('amountLabel'),
              customAmountLabel: t('customAmountLabel'),
              customAmountPlaceholder: t('customAmountPlaceholder'),
              messageLabel: t('messageLabel'),
              messagePlaceholder: t('messagePlaceholder'),
              anonymousLabel: t('anonymousLabel'),
              donatingAsLabel: t('donatingAsLabel'),
              donateButton: t('donateButton'),
              processingButton: t('processingButton'),
            }}
          />
        </Div>

        {/* Donation Wall */}
        <Div>
          <H2 className="text-2xl font-semibold mb-6 text-center">{t('recentSupporters')}</H2>
          <DonationWall projectId="fengshui" limit={12} noDonationsText={t('noDonations')} />
        </Div>

        {/* Thank You Message */}
        <Div className="mt-16 p-6 bg-muted rounded-lg text-center">
          <P className="text-muted-foreground">{t('thankYou')}</P>
        </Div>
      </Div>
    </Section>
  )
}
