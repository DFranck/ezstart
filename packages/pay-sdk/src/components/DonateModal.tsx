'use client'

import {
  Button,
  Checkbox,
  Div,
  Icon,
  Input,
  Label,
  Modal,
  P,
  Span,
  Textarea,
} from '@ezstart/ui/components'
import { toast } from '@ezstart/ui/utils'
import { useState } from 'react'
import { usePay } from '../react/pay-provider.js'
import { DonateButton } from './DonateButton.js'
import { formatCurrency, getCurrencySymbol } from '../core/format-currency.js'

export interface DonateModalTexts {
  title?: string
  description?: string
  amountLabel?: string
  customAmountLabel?: string
  customAmountPlaceholder?: string
  messageLabel?: string
  messagePlaceholder?: string
  anonymousLabel?: string
  donatingAsLabel?: string
  donateButton?: string
  processingButton?: string
}

export interface DonateModalProps {
  projectId: string
  projectName?: string
  amounts?: number[]
  currency?: string // ISO code: EUR, USD, GBP, etc.
  userId?: string
  userEmail?: string
  userName?: string
  trigger?: React.ReactNode
  texts?: DonateModalTexts
}

export function DonateModal({
  projectId,
  projectName,
  amounts = [5, 10],
  currency = 'EUR',
  userId,
  userEmail,
  userName,
  trigger,
  texts,
}: DonateModalProps) {
  const { createDonation, isLoading } = usePay()
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState(amounts[1] || 10)
  const [customAmount, setCustomAmount] = useState('')
  const [message, setMessage] = useState('')
  const [isAnonymous, setIsAnonymous] = useState(false)

  // Default texts with fallback
  const symbol = getCurrencySymbol(currency)

  const t = {
    title: texts?.title || `Support ${projectName || projectId}`,
    // Provided to Modal as the accessible description (DialogDescription) —
    // satisfies the modal's `aria-describedby` accessibility requirement.
    description:
      texts?.description || 'Your support helps us keep this project running and improving.',
    amountLabel: texts?.amountLabel || 'Amount',
    customAmountLabel: texts?.customAmountLabel || `Custom amount (${symbol})`,
    customAmountPlaceholder: texts?.customAmountPlaceholder || 'Enter custom amount',
    messageLabel: texts?.messageLabel || 'Message (optional)',
    messagePlaceholder: texts?.messagePlaceholder || 'Leave a message...',
    anonymousLabel: texts?.anonymousLabel || 'Donate anonymously',
    donatingAsLabel: texts?.donatingAsLabel || 'Donating as',
    donateButton: texts?.donateButton || 'Donate',
    processingButton: texts?.processingButton || 'Processing...',
  }

  const finalAmount = customAmount ? parseFloat(customAmount) : amount

  const handleDonate = async (e: React.FormEvent) => {
    e.preventDefault()

    if (finalAmount <= 0 || isNaN(finalAmount)) {
      return
    }

    try {
      const result = await createDonation({
        projectId,
        amount: finalAmount,
        currency,
        message: message || undefined,
        isPublic: true,
        isAnonymous,
        userId,
        donorEmail: userEmail,
        donorName: isAnonymous ? 'Anonymous' : userName,
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
      <Div onClick={() => setOpen(true)}>{trigger || <DonateButton>❤️ Donate</DonateButton>}</Div>

      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title={
          <span className="flex items-center gap-2">
            <Icon name="lucide:Heart" className="w-5 h-5" />
            {t.title}
          </span>
        }
        description={t.description}
      >
        <form onSubmit={handleDonate} className="px-2 flex flex-col gap-4">
          {/* Preset amounts - Large buttons */}
          <Div>
            <Label className="text-base font-semibold">{t.amountLabel}</Label>
            <Div layout={'grid'}>
              {amounts.map(val => (
                <Button
                  key={val}
                  type="button"
                  variant={amount === val ? 'default' : 'secondary'}
                  onClick={() => {
                    setAmount(val)
                    setCustomAmount('')
                  }}
                >
                  <Span className="text-2xl font-bold">{formatCurrency(val, currency)}</Span>
                  {val === amounts[1] && <Span className="text-xs opacity-70">Popular</Span>}
                </Button>
              ))}
            </Div>
          </Div>

          {/* Custom amount - Simplified */}
          <Div>
            <Label htmlFor="custom-amount" className="mb-1 text-base font-semibold">
              {t.customAmountLabel}
            </Label>
            <Div className="relative">
              <Input
                id="custom-amount"
                type="number"
                min="1"
                step="0.01"
                value={customAmount}
                onChange={e => setCustomAmount(e.target.value)}
                placeholder="0.00"
                className="pl-7"
              />
            </Div>
          </Div>

          {/* Message - Compact */}
          <Div>
            <Label htmlFor="message" className="text-sm mb-1">
              {t.messageLabel}
            </Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMessage(e.target.value)}
              placeholder={t.messagePlaceholder}
              maxLength={200}
              rows={2}
              className="text-sm resize-none"
            />
          </Div>

          {/* Anonymous toggle - Simplified */}
          {userId && (
            <Div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Checkbox
                id="anonymous"
                checked={isAnonymous}
                onCheckedChange={checked => setIsAnonymous(checked === true)}
              />
              <Label htmlFor="anonymous" className="cursor-pointer text-sm font-normal">
                {t.anonymousLabel}
              </Label>
            </Div>
          )}

          {/* CTA Button - Large and attractive */}
          <Button
            type="submit"
            disabled={isLoading || finalAmount <= 0 || isNaN(finalAmount)}
            size="lg"
            className="w-full"
          >
            {isLoading ? (
              <Span className="flex items-center gap-2">
                <Icon name="lucide:Loader2" className="w-5 h-5 animate-spin" />
                {t.processingButton}
              </Span>
            ) : (
              <Span className="flex items-center gap-2">
                <Icon name="lucide:Heart" className="w-5 h-5" />
                {t.donateButton} {formatCurrency(finalAmount, currency)}
              </Span>
            )}
          </Button>

          {/* User info - Subtle */}
          {userId && !isAnonymous && userName && (
            <P className="text-xs text-center text-muted-foreground">
              {t.donatingAsLabel} <Span className="font-medium">{userName}</Span>
            </P>
          )}
        </form>
      </Modal>
    </>
  )
}
