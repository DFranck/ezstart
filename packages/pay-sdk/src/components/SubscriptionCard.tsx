'use client'

import { Badge, Button, Card, CardContent, Icon, Modal, P } from '@ezstart/ui/components'
import { logger } from '@ezstart/logger'
import { useState } from 'react'
import { usePayContext } from '../provider.js'
import { formatCurrency } from '../utils/format-currency.js'
import type { PaymentStatus } from '../types.js'

export interface SubscriptionCardTexts {
  cancel?: string
  active?: string
  pending?: string
  cancelled?: string
  confirmCancel?: string
  confirmTitle?: string
  confirmNo?: string
}

export interface SubscriptionCardProps {
  subscription: {
    id: string
    projectId: string
    planName?: string
    amount: number
    currency?: string
    interval?: string
    intervalCount?: number
    status: string
    metadata?: { subscriptionId?: string }
  }
  onCancel?: (subscriptionId: string) => Promise<void>
  showCancel?: boolean
  loading?: boolean
  className?: string
  texts?: SubscriptionCardTexts
}

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'secondary'> = {
  completed: 'success',
  pending: 'warning',
  cancelled: 'secondary',
}

export function SubscriptionCard({
  subscription,
  onCancel,
  showCancel = true,
  loading = false,
  className,
  texts,
}: SubscriptionCardProps) {
  const { client } = usePayContext()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  const t = {
    cancel: texts?.cancel || 'Cancel subscription',
    active: texts?.active || 'Active',
    pending: texts?.pending || 'Pending',
    cancelled: texts?.cancelled || 'Cancelled',
    confirmCancel: texts?.confirmCancel || 'Are you sure you want to cancel this subscription?',
    confirmTitle: texts?.confirmTitle || 'Cancel subscription',
    confirmNo: texts?.confirmNo || 'Keep subscription',
  }

  const statusLabel =
    subscription.status === 'completed'
      ? t.active
      : subscription.status === 'pending'
        ? t.pending
        : t.cancelled

  const statusVariant = STATUS_VARIANT[subscription.status] || 'secondary'

  const currency = subscription.currency || 'EUR'
  const intervalLabel =
    subscription.intervalCount && subscription.intervalCount > 1
      ? `${subscription.intervalCount} ${subscription.interval || 'month'}s`
      : subscription.interval || 'month'

  const subscriptionId = subscription.metadata?.subscriptionId
  const canCancel = showCancel && subscription.status === 'completed' && !!subscriptionId

  const handleCancel = async () => {
    if (!subscriptionId) return
    setCancelling(true)
    try {
      if (onCancel) {
        await onCancel(subscriptionId)
      } else {
        await client.cancelSubscription(subscriptionId)
      }
    } catch (err) {
      logger.error(
        'Failed to cancel subscription:',
        err instanceof Error ? err.message : String(err)
      )
    } finally {
      setCancelling(false)
      setConfirmOpen(false)
    }
  }

  return (
    <>
      <Card size="sm" className={className}>
        <CardContent className="p-4 flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <P className="font-semibold truncate">
                {subscription.planName || subscription.projectId}
              </P>
              <P size="lg" className="font-bold mt-1">
                {formatCurrency(subscription.amount, currency)} / {intervalLabel}
              </P>
            </div>
            <Badge variant={statusVariant} size="sm" dot>
              {statusLabel}
            </Badge>
          </div>

          {canCancel && (
            <Button
              variant="destructive"
              size="sm"
              disabled={loading || cancelling}
              onClick={() => setConfirmOpen(true)}
              className="w-full"
            >
              {cancelling ? (
                <span className="flex items-center gap-2">
                  <Icon name="lucide:Loader2" className="w-4 h-4 animate-spin" />
                  {t.cancel}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Icon name="lucide:XCircle" className="w-4 h-4" />
                  {t.cancel}
                </span>
              )}
            </Button>
          )}
        </CardContent>
      </Card>

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
              disabled={cancelling}
            >
              {t.confirmNo}
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={handleCancel}
              disabled={cancelling}
            >
              {cancelling ? (
                <span className="flex items-center gap-2">
                  <Icon name="lucide:Loader2" className="w-4 h-4 animate-spin" />
                  {t.cancel}
                </span>
              ) : (
                t.cancel
              )}
            </Button>
          </div>
        }
      >
        <P>{t.confirmCancel}</P>
      </Modal>
    </>
  )
}
