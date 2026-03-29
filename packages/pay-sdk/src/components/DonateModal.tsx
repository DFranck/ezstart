'use client'

import { Button, Div, H2, Icon, Input, Label, Modal, P, TextArea } from '@ezstart/ui/components'
import { logger } from '@ezstart/logger'
import { useState } from 'react'
import { usePay } from '../provider.js'
import { DonateButton } from './DonateButton.js'

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
  currency?: string // ISO code: USD, EUR, GBP, etc.
  currencySymbol?: string // Display symbol: $, €, £, etc.
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
  currency = 'USD',
  currencySymbol = '$',
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
  const t = {
    title: texts?.title || `Support ${projectName || projectId}`,
    description:
      texts?.description || 'Your support helps us keep this project running and improving.',
    amountLabel: texts?.amountLabel || 'Amount',
    customAmountLabel: texts?.customAmountLabel || `Custom amount (${currencySymbol})`,
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
      logger.error('Donation failed:', error)
    }
  }

  return (
    <>
      <div onClick={() => setOpen(true)}>{trigger || <DonateButton>❤️ Donate</DonateButton>}</div>

      <Modal isOpen={open} onClose={() => setOpen(false)}>
        <form onSubmit={handleDonate} className="px-2 flex flex-col gap-4">
          {/* Header with gradient */}
          <Div layout={'center'}>
            <H2 size={'h4'} className="flex items-center justify-center gap-2">
              <Icon name="lucide:Heart" className="w-8 h-8 text-white" />
              {t.title}
            </H2>
            <P size={'sm'} variant={'description'}>
              {t.description}
            </P>
          </Div>

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
                  <span className="text-2xl font-bold">
                    {currencySymbol}
                    {val}
                  </span>
                  {val === amounts[1] && <span className="text-xs opacity-70">Popular</span>}
                </Button>
              ))}
            </Div>
          </Div>

          {/* Custom amount - Simplified */}
          <Div>
            <Label htmlFor="custom-amount" className="mb-1 text-base font-semibold">
              {t.customAmountLabel}
            </Label>
            <div className="relative">
              {/* <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-base font-medium">
                {currencySymbol}
              </span> */}
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
            </div>
          </Div>

          {/* Message - Compact */}
          <Div>
            <Label htmlFor="message" className="text-sm mb-1">
              {t.messageLabel}
            </Label>
            <TextArea
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
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <input
                type="checkbox"
                id="anonymous"
                checked={isAnonymous}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setIsAnonymous(e.target.checked)
                }
                className="w-4 h-4 rounded border-input"
              />
              <Label htmlFor="anonymous" className="cursor-pointer text-sm font-normal">
                {t.anonymousLabel}
              </Label>
            </div>
          )}

          {/* CTA Button - Large and attractive */}
          <Button
            type="submit"
            disabled={isLoading || finalAmount <= 0 || isNaN(finalAmount)}
            size="lg"
            className="w-full"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <Icon name="lucide:Loader2" className="w-5 h-5 animate-spin" />
                {t.processingButton}
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Icon name="lucide:Heart" className="w-5 h-5" />
                {t.donateButton} {currencySymbol}
                {finalAmount.toFixed(2)}
              </span>
            )}
          </Button>

          {/* User info - Subtle */}
          {userId && !isAnonymous && userName && (
            <p className="text-xs text-center text-muted-foreground">
              {t.donatingAsLabel} <span className="font-medium">{userName}</span>
            </p>
          )}
        </form>
      </Modal>
    </>
  )
}
