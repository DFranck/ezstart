'use client'

import { getGradientWithOpacity, GRADIENT_TEXT } from '@/lib/theme-colors'
import { useAuth } from '@ezstart/auth-sdk'
import { DonateModal, DonationWall } from '@ezstart/pay-sdk'
import { H1, P, Section } from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'

export default function DonatePage(): any {
  const { user } = useAuth()
  const t = useTranslations('donate')

  return (
    <Section size={'full'} className="relative">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        {/* Gradient animé */}
        <div className="absolute inset-0 animate-pulse" style={getGradientWithOpacity(20, 'br')} />
        <div
          className="absolute inset-0 animate-pulse"
          style={{ ...getGradientWithOpacity(20, 'tr'), animationDelay: '1s' }}
        />
      </div>
      <div className="max-w-4xl mx-auto pt-20">
        {/* Header */}
        <div className="text-center mb-12">
          <H1 className="text-5xl md:text-7xl font-bold mb-6">
            <span className={`bg-gradient-to-r ${GRADIENT_TEXT}`}>{t('pageTitle')}</span>
          </H1>
          <P className="text-xl text-muted-foreground">{t('pageDescription')}</P>
        </div>

        {/* Donate Button */}
        <div className="flex justify-center mb-16">
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
        </div>

        {/* Donation Wall */}
        <div>
          <h2 className="text-2xl font-semibold mb-6 text-center">{t('recentSupporters')}</h2>
          <DonationWall projectId="fengshui" limit={12} noDonationsText={t('noDonations')} />
        </div>

        {/* Thank You Message */}
        <div className="mt-16 p-6 bg-muted rounded-lg text-center">
          <P className="text-muted-foreground">{t('thankYou')}</P>
        </div>
      </div>
    </Section>
  )
}
