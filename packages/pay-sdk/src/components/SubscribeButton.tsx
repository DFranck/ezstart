'use client'

import { Button, Div, Icon, Modal, P } from '@ezstart/ui/components'
import { toast } from '@ezstart/ui/utils'
import { useState } from 'react'
import { usePay, useApplicationContext } from '../react/pay-provider.js'
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
  /**
   * Template for the trial disclosure line shown inside the modal, e.g.
   * "Includes {days} days free trial — cancel anytime.". Use `{days}`.
   */
  trialNoteTemplate?: string
}

export interface SubscribeButtonProps {
  projectId: string
  /** Ezauth Application id (preferred). When omitted, resolves from PayProvider context. */
  applicationId?: string
  priceId: string
  planName: string
  amount: number
  intervalCount?: number
  currency?: string
  description?: string
  userId?: string
  userEmail?: string
  userName?: string
  /**
   * Free-trial duration (in days) attached to the plan. When set to a
   * positive value, a trial disclosure is shown inside the subscribe modal.
   * The backend is the source of truth — this prop is purely for display.
   */
  trialDays?: number
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
  applicationId,
  priceId,
  planName,
  amount,
  intervalCount = 1,
  currency = 'EUR',
  description,
  userId,
  userEmail,
  userName,
  trialDays,
  promoCode: promoCodeProp,
  showPromoInput = false,
  trigger,
  className,
  texts,
}: SubscribeButtonProps) {
  const { createSubscription, isLoading } = usePay()
  const { applicationId: ctxApplicationId } = useApplicationContext()
  const effectiveApplicationId = applicationId ?? ctxApplicationId ?? undefined
  const [open, setOpen] = useState(false)
  const [promoCode, setPromoCode] = useState(promoCodeProp || '')
  const [promoValidation, setPromoValidation] = useState<PromoValidation | null>(null)

  // Default texts with fallback
  const t = {
    title: texts?.title || `Subscribe to ${planName}`,
    // Provided to Modal as the accessible description (DialogDescription) —
    // satisfies the modal's `aria-describedby` accessibility requirement and
    // ensures screen-reader users hear context before the form fields.
    description: texts?.description || description || `Confirm your subscription to ${planName}.`,
    subscribeButton: texts?.subscribeButton || 'Subscribe now',
    processingButton: texts?.processingButton || 'Processing...',
    intervalMonth: texts?.intervalMonth || 'month',
    intervalYear: texts?.intervalYear || 'year',
    promoCodeLabel: texts?.promoCodeLabel || 'Promo code',
    trialNoteTemplate:
      texts?.trialNoteTemplate || 'Includes {days} days free trial — cancel anytime.',
  }

  const trialNote =
    typeof trialDays === 'number' && trialDays > 0
      ? t.trialNoteTemplate.replace('{days}', String(trialDays))
      : null

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
        ...(effectiveApplicationId ? { applicationId: effectiveApplicationId } : {}),
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
      toast.error(error instanceof Error ? error.message : String(error))
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

      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title={
          <span className="flex items-center gap-2">
            <Icon name="lucide:CreditCard" className="w-5 h-5" />
            {t.title}
          </span>
        }
        description={t.description}
      >
        <form onSubmit={handleSubscribe} className="px-2 flex flex-col gap-4">
          {/* Plan info */}
          <Div className="p-4 rounded-lg bg-muted/50 flex flex-col gap-2">
            <P className="font-semibold">{planName}</P>
            <P size={'lg'} className="font-bold">
              {formatCurrency(amount, currency)} / {intervalLabel}
            </P>
            {trialNote && (
              <P size="sm" className="text-muted-foreground">
                {trialNote}
              </P>
            )}
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
