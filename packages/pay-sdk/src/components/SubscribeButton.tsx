'use client'

import { Button, Div, H2, Icon, Input, Modal, P } from '@ezstart/ui/components'
import { logger } from '@ezstart/logger'
import { useState } from 'react'
import { usePay, usePayContext } from '../react/pay-provider.js'
import { formatCurrency } from '../core/format-currency.js'
import { PromoCodeInput, type PromoValidation } from './PromoCodeInput.js'

export interface SubscribeButtonTexts {
  title?: string
  description?: string
  subscribeButton?: string
  processingButton?: string
  intervalMonth?: string
  intervalYear?: string
  /** Template for multi-interval display, e.g. "{count} months". Use {count} placeholder. */
  intervalCountTemplate?: string
  promoCodePlaceholder?: string
  promoCodeLabel?: string
}

export interface SubscribeButtonProps {
  projectId: string
  priceId: string
  planName: string
  amount: number
  intervalCount?: number
  currency?: string
  description?: string
  userId?: string
  userEmail?: string
  userName?: string
  /** Pre-filled promo code. When set, the promo input is shown with this value. */
  promoCode?: string
  /** Show an inline promo code input inside the subscribe modal. Default false. */
  showPromoInput?: boolean
  trigger?: React.ReactNode
  className?: string
  texts?: SubscribeButtonTexts
}

export function SubscribeButton({
  projectId,
  priceId,
  planName,
  amount,
  intervalCount = 1,
  currency = 'EUR',
  description,
  userId,
  userEmail,
  userName,
  promoCode: promoCodeProp,
  showPromoInput = false,
  trigger,
  className,
  texts,
}: SubscribeButtonProps) {
  const { createSubscription, isLoading } = usePay()
  const [open, setOpen] = useState(false)
  const [promoCode, setPromoCode] = useState(promoCodeProp || '')
  const [promoValidation, setPromoValidation] = useState<PromoValidation | null>(null)

  // Default texts with fallback
  const t = {
    title: texts?.title || `Subscribe to ${planName}`,
    description: texts?.description || description || '',
    subscribeButton: texts?.subscribeButton || 'Subscribe now',
    processingButton: texts?.processingButton || 'Processing...',
    intervalMonth: texts?.intervalMonth || 'month',
    intervalYear: texts?.intervalYear || 'year',
    promoCodeLabel: texts?.promoCodeLabel || 'Promo code',
  }

  // Smart interval display: 1→month, 12→year, other→N months
  const intervalLabel =
    intervalCount === 12
      ? t.intervalYear
      : intervalCount === 1
        ? t.intervalMonth
        : texts?.intervalCountTemplate
          ? texts.intervalCountTemplate.replace('{count}', String(intervalCount))
          : `${intervalCount} ${t.intervalMonth}s`

  // Sync promoCode prop changes
  const effectivePromoCode = promoCode || promoCodeProp || ''

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const result = await createSubscription({
        projectId,
        planId: priceId,
        planName,
        amount,
        interval: 'month',
        intervalCount,
        currency,
        userId,
        customerEmail: userEmail,
        customerName: userName,
        ...(effectivePromoCode.trim() ? { promoCode: effectivePromoCode.trim() } : {}),
      })

      // Redirect to Stripe checkout
      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl
      }
    } catch (error) {
      logger.error('Subscription failed:', error instanceof Error ? error.message : String(error))
    }
  }

  return (
    <>
      <div onClick={() => setOpen(true)} className={className}>
        {trigger || (
          <Button variant="default">
            <Icon name="lucide:CreditCard" className="w-4 h-4" />
            {planName} — {formatCurrency(amount, currency)}/{intervalLabel}
          </Button>
        )}
      </div>

      <Modal isOpen={open} onClose={() => setOpen(false)}>
        <form onSubmit={handleSubscribe} className="px-2 flex flex-col gap-4">
          {/* Header */}
          <Div layout={'center'}>
            <H2 size={'h4'} className="flex items-center justify-center gap-2">
              <Icon name="lucide:CreditCard" className="w-8 h-8 text-white" />
              {t.title}
            </H2>
            {t.description && (
              <P size={'sm'} variant={'description'}>
                {t.description}
              </P>
            )}
          </Div>

          {/* Plan info */}
          <Div className="p-4 rounded-lg bg-muted/50 flex flex-col gap-2">
            <P className="font-semibold">{planName}</P>
            <P size={'lg'} className="font-bold">
              {formatCurrency(amount, currency)} / {intervalLabel}
            </P>
          </Div>

          {/* User info */}
          {userName && (
            <P size={'sm'} variant={'description'} className="text-center">
              Subscribing as <span className="font-medium">{userName}</span>
            </P>
          )}

          {/* Promo code input */}
          {showPromoInput && (
            <Div className="flex flex-col gap-1">
              <P size="sm" className="font-medium">
                {t.promoCodeLabel}
              </P>
              <PromoCodeInput
                appName={projectId}
                value={promoCode}
                onChange={setPromoCode}
                onValidated={setPromoValidation}
                texts={{
                  placeholder: texts?.promoCodePlaceholder,
                }}
              />
            </Div>
          )}

          {/* CTA Button */}
          <Button type="submit" disabled={isLoading} size="lg" className="w-full">
            {isLoading ? (
              <span className="flex items-center gap-2">
                <Icon name="lucide:Loader2" className="w-5 h-5 animate-spin" />
                {t.processingButton}
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Icon name="lucide:CreditCard" className="w-5 h-5" />
                {t.subscribeButton} — {formatCurrency(amount, currency)}/{intervalLabel}
              </span>
            )}
          </Button>
        </form>
      </Modal>
    </>
  )
}
