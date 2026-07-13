'use client'

import { Button, ConfirmActionDialog, Icon } from '@ezstart/ui/components'
import { useCallback, useState } from 'react'
import { useRefundPayment } from '../react/hooks/useRefundPayment.js'
import { formatCurrency } from '../core/format-currency.js'

export interface RefundButtonTexts {
  refund?: string
  confirm?: string
  success?: string
  error?: string
  confirmTitle?: string
  cancel?: string
  loading?: string
  close?: string
  retry?: string
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
  const refundMutation = useRefundPayment()
  const [confirmOpen, setConfirmOpen] = useState(false)

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
    loading: texts?.loading || 'Refunding...',
    close: texts?.close || 'Close',
    retry: texts?.retry || 'Retry',
  }

  const handleRefund = useCallback(async () => {
    try {
      if (onRefund) {
        await onRefund(paymentId)
      } else {
        // Uses `useRefundPayment` — on success the mutation invalidates the
        // shared `SUBSCRIPTIONS_QUERY_KEY` cache so the dashboard reflects
        // the refunded status without a manual reload.
        await refundMutation.mutateAsync(paymentId)
      }
      onSuccess?.()
    } catch (err) {
      const message = err instanceof Error ? err.message : t.error
      onError?.(message)
      throw err
    }
  }, [paymentId, onRefund, refundMutation, onSuccess, onError, t.error])

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={() => setConfirmOpen(true)}
        className={className}
      >
        <span className="flex items-center gap-2">
          <Icon name="lucide:RotateCcw" className="w-4 h-4" />
          {t.refund}
        </span>
      </Button>

      <ConfirmActionDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t.confirmTitle}
        description={t.confirm}
        onConfirm={handleRefund}
        variant="destructive"
        texts={{
          confirmLabel: t.refund,
          cancelLabel: t.cancel,
          loadingMessage: t.loading,
          successMessage: t.success,
          errorMessage: t.error,
          retryLabel: t.retry,
          closeLabel: t.close,
        }}
      />
    </>
  )
}
