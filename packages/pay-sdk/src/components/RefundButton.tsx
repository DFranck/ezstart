'use client'

import { Button, Icon, Modal, P } from '@ezstart/ui/components'
import { logger } from '@ezstart/logger'
import { useState } from 'react'
import { usePayContext } from '../provider.js'
import { formatCurrency } from '../utils/format-currency.js'

export interface RefundButtonTexts {
  refund?: string
  confirm?: string
  success?: string
  error?: string
  confirmTitle?: string
  cancel?: string
}

export interface RefundButtonProps {
  paymentId: string
  amount?: number
  currency?: string
  disabled?: boolean
  onRefund?: (paymentId: string) => Promise<void>
  onSuccess?: () => void
  onError?: (error: string) => void
  className?: string
  texts?: RefundButtonTexts
}

export function RefundButton({
  paymentId,
  amount,
  currency = 'EUR',
  disabled = false,
  onRefund,
  onSuccess,
  onError,
  className,
  texts,
}: RefundButtonProps) {
  const { client } = usePayContext()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [refunding, setRefunding] = useState(false)

  const t = {
    refund: texts?.refund || 'Refund',
    confirm:
      texts?.confirm ||
      (amount
        ? `Are you sure you want to refund ${formatCurrency(amount, currency)}?`
        : 'Are you sure you want to refund this payment?'),
    success: texts?.success || 'Refund successful',
    error: texts?.error || 'Refund failed',
    confirmTitle: texts?.confirmTitle || 'Confirm refund',
    cancel: texts?.cancel || 'Cancel',
  }

  const handleRefund = async () => {
    setRefunding(true)
    try {
      if (onRefund) {
        await onRefund(paymentId)
      } else {
        await client.refundPayment(paymentId)
      }
      onSuccess?.()
    } catch (err) {
      const message = err instanceof Error ? err.message : t.error
      logger.error('Refund failed:', message)
      onError?.(message)
    } finally {
      setRefunding(false)
      setConfirmOpen(false)
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        disabled={disabled || refunding}
        onClick={() => setConfirmOpen(true)}
        className={className}
      >
        {refunding ? (
          <span className="flex items-center gap-2">
            <Icon name="lucide:Loader2" className="w-4 h-4 animate-spin" />
            {t.refund}
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <Icon name="lucide:RotateCcw" className="w-4 h-4" />
            {t.refund}
          </span>
        )}
      </Button>

      <Modal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={t.confirmTitle}
        size="sm"
        footer={
          <div className="flex gap-2 w-full">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setConfirmOpen(false)}
              disabled={refunding}
            >
              {t.cancel}
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={handleRefund}
              disabled={refunding}
            >
              {refunding ? (
                <span className="flex items-center gap-2">
                  <Icon name="lucide:Loader2" className="w-4 h-4 animate-spin" />
                  {t.refund}
                </span>
              ) : (
                t.refund
              )}
            </Button>
          </div>
        }
      >
        <P>{t.confirm}</P>
      </Modal>
    </>
  )
}
