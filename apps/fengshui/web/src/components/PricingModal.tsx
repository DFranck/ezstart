'use client'

import { GRADIENT_BG } from '@/lib/theme-colors'
import { useAuth } from '@ezstart/auth-sdk'
import { usePay } from '@ezstart/pay-sdk'
import { logger } from '@ezstart/logger'
import {
  Button,
  Card,
  CardContent,
  Div,
  H3,
  Icon,
  LI,
  Modal,
  Span,
  UL,
} from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

type PricingModalProps = {
  isOpen: boolean
  onClose: () => void
  year: number
}

const PRICES = {
  oneshot: { amount: 4.99, currency: '€' },
  monthly: { amount: 2.99, currency: '€' },
  yearly: { amount: 19.99, currency: '€' },
}

export default function PricingModal({ isOpen, onClose, year }: PricingModalProps) {
  const t = useTranslations('premium')
  const { user, isAuthenticated, login } = useAuth()
  const { createPurchase, createSubscription } = usePay()
  const [loading, setLoading] = useState<string | null>(null)

  const handlePurchase = async (type: 'oneshot' | 'monthly' | 'yearly') => {
    if (!isAuthenticated) {
      login()
      return
    }

    setLoading(type)
    try {
      if (type === 'oneshot') {
        const res = await createPurchase({
          projectId: 'fengshui',
          productId: `fengshui-stars-${year}`,
          productName: `FengShui Flying Stars ${year}`,
          amount: PRICES.oneshot.amount,
          currency: 'eur',
          userId: user?._id || '',
          customerEmail: user?.email || '',
        })
        if (res?.checkoutUrl) {
          window.location.href = res.checkoutUrl
        }
      } else {
        const intervalCount = type === 'monthly' ? 1 : 12
        const res = await createSubscription({
          projectId: 'fengshui',
          planId: `fengshui-premium-${type}`,
          planName: `FengShui Premium ${type === 'monthly' ? 'Monthly' : 'Yearly'}`,
          amount: type === 'monthly' ? PRICES.monthly.amount : PRICES.yearly.amount,
          currency: 'eur',
          interval: 'month',
          intervalCount,
          userId: user?._id || '',
          customerEmail: user?.email || '',
        })
        if (res?.checkoutUrl) {
          window.location.href = res.checkoutUrl
        }
      }
    } catch (err) {
      logger.error('Payment error:', err)
    } finally {
      setLoading(null)
    }
  }

  const freeFeatures = [t('freeFeature1'), t('freeFeature2'), t('freeFeature3'), t('freeFeature4')]

  const premiumFeatures = [
    t('premiumFeature1'),
    t('premiumFeature2'),
    t('premiumFeature3'),
    t('premiumFeature4'),
  ]

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('pricingTitle')}
      description={t('pricingSubtitle', { year })}
      size="xl"
    >
      <Div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
        {/* Free Tier */}
        <Card className="border-2 border-border">
          <CardContent className="p-6">
            <Div className="text-center mb-6">
              <Icon name="lucide:Shield" className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <H3 className="text-lg font-bold text-foreground">{t('freeTitle')}</H3>
              <Div className="mt-2">
                <Span className="text-3xl font-bold text-foreground">{t('freePrice')}</Span>
              </Div>
            </Div>
            <UL className="space-y-3">
              {freeFeatures.map((feature, idx) => (
                <LI key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Icon name="lucide:Check" className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                  {feature}
                </LI>
              ))}
            </UL>
            <Button variant="outline" className="w-full mt-6" onClick={onClose}>
              {t('freeTitle')}
            </Button>
          </CardContent>
        </Card>

        {/* Premium Tier */}
        <Card className="border-2 border-warning relative overflow-hidden">
          {/* Popular badge */}
          <Div className="absolute top-0 right-0 bg-warning text-warning-foreground text-xs font-bold px-3 py-1 rounded-bl-lg">
            {t('popular')}
          </Div>
          <CardContent className="p-6">
            <Div className="text-center mb-6">
              <Icon name="lucide:Star" className="w-10 h-10 text-warning mx-auto mb-3" />
              <H3 className="text-lg font-bold text-foreground">{t('premiumTitle', { year })}</H3>
            </Div>

            <UL className="space-y-3 mb-6">
              {premiumFeatures.map((feature, idx) => (
                <LI key={idx} className="flex items-start gap-2 text-sm text-foreground">
                  <Icon name="lucide:Star" className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" />
                  {feature}
                </LI>
              ))}
            </UL>

            {/* Price options */}
            <Div className="space-y-2">
              {/* One-time */}
              <Button
                onClick={() => handlePurchase('oneshot')}
                disabled={!!loading}
                className={`w-full ${GRADIENT_BG} text-white shadow-lg hover:shadow-xl transition-all`}
              >
                {loading === 'oneshot' ? (
                  <Icon name="lucide:Loader2" className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Icon name="lucide:Zap" className="w-4 h-4 mr-2" />
                )}
                {t('oneTime')} — {PRICES.oneshot.amount}
                {PRICES.oneshot.currency}
              </Button>

              {/* Monthly */}
              <Button
                onClick={() => handlePurchase('monthly')}
                disabled={!!loading}
                variant="outline"
                className="w-full border-warning/50 text-warning hover:bg-warning/10"
              >
                {loading === 'monthly' ? (
                  <Icon name="lucide:Loader2" className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Icon name="lucide:RefreshCw" className="w-4 h-4 mr-2" />
                )}
                {t('monthly')} — {PRICES.monthly.amount}
                {PRICES.monthly.currency}
                {t('perMonth')}
              </Button>

              {/* Yearly */}
              <Button
                onClick={() => handlePurchase('yearly')}
                disabled={!!loading}
                variant="outline"
                className="w-full border-warning/50 text-warning hover:bg-warning/10"
              >
                {loading === 'yearly' ? (
                  <Icon name="lucide:Loader2" className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Icon name="lucide:Crown" className="w-4 h-4 mr-2" />
                )}
                {t('yearly')} — {PRICES.yearly.amount}
                {PRICES.yearly.currency}
                {t('perYear')}
                <Span className="ml-1 text-xs bg-success/10 text-success px-1.5 py-0.5 rounded-full">
                  {t('bestValue')}
                </Span>
              </Button>
            </Div>
          </CardContent>
        </Card>
      </Div>
    </Modal>
  )
}
