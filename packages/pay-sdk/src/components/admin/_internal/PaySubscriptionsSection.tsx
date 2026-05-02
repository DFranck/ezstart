'use client'

/**
 * Subscriptions tab content for `<PayAdminDashboard>`.
 *
 * Auto-scoped server-side via JWT. Plans were split into their own tab — this
 * section focuses solely on active subscriptions + MRR.
 *
 * @internal
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Badge,
  Button,
  Card,
  ConfirmActionDialog,
  DataTable,
  DataTableColumnHeader,
  Div,
  Skeleton,
  Span,
  type ColumnDef,
} from '@ezstart/ui/components'
import { toast } from '@ezstart/ui/utils'
import type { Payment } from '../../../core/types.js'
import { formatCurrency } from '../../../core/format-currency.js'
import { usePayContext } from '../../../react/pay-provider.js'
import type { PaySubscriptionsSectionTexts } from './types.js'
import { PAGE_SIZE, STATUS_VARIANT, formatDateShort } from './helpers.js'
import { EmptyState, StatCard } from './primitives.js'

export const DEFAULT_SUBSCRIPTIONS_TEXTS: Required<PaySubscriptionsSectionTexts> = {
  activeSubscriptions: 'Active Subscriptions',
  mrr: 'Monthly Recurring Revenue',
  userHeader: 'User',
  planHeader: 'Plan',
  intervalHeader: 'Interval',
  amountHeader: 'Amount',
  statusHeader: 'Status',
  startedHeader: 'Started',
  actionsHeader: 'Actions',
  columnApp: 'App',
  completed: 'Completed',
  pending: 'Pending',
  failed: 'Failed',
  refunded: 'Refunded',
  cancelled: 'Cancelled',
  monthly: 'Monthly',
  cancelSubscription: 'Cancel',
  cancelSubscriptionTitle: 'Cancel Subscription',
  cancelSubscriptionDescription:
    'Are you sure you want to cancel this subscription? The customer will lose access at the end of the current billing period.',
  cancelSubscriptionSuccess: 'Subscription cancelled successfully',
  cancelSubscriptionError: 'Failed to cancel subscription',
  cancelAllSubscriptions: 'Cancel All Active',
  cancelAllConfirm: 'Cancel ALL active subscriptions? This cannot be undone.',
  cancelAllSuccess: 'Bulk cancel completed',
  noSubscriptions: 'No subscriptions found.',
  confirm: 'Confirm',
  cancel: 'Cancel',
  loading: 'Processing...',
  close: 'Close',
  retry: 'Retry',
}

interface PaySubscriptionsSectionProps {
  texts: Required<PaySubscriptionsSectionTexts>
  testMode?: boolean
}

export function PaySubscriptionsSection({ texts: t, testMode }: PaySubscriptionsSectionProps) {
  const { client } = usePayContext()

  const [subscriptions, setSubscriptions] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [statsLoading, setStatsLoading] = useState(true)

  // Stats
  const [activeCount, setActiveCount] = useState(0)
  const [mrrByCurrency, setMrrByCurrency] = useState<Record<string, number>>({})

  // Cancel dialog
  const [cancelDialog, setCancelDialog] = useState<{
    open: boolean
    payment: Payment | null
  }>({ open: false, payment: null })

  // Derive liveMode filter from testMode prop
  const liveModeFilter = testMode === true ? 'false' : testMode === false ? 'true' : undefined

  // Fetch subscriptions
  const fetchSubscriptions = useCallback(() => {
    setLoading(true)
    setStatsLoading(true)
    client
      .getSubscriptions({
        limit: 100,
        liveMode: liveModeFilter,
      })
      .then(result => {
        setSubscriptions(result.payments)
        let active = 0
        const mrrMap: Record<string, number> = {}
        for (const sub of result.payments) {
          if (sub.status === 'completed') {
            active++
            const intervalCount = (sub.metadata?.intervalCount as number | undefined) || 1
            const cur = sub.currency || 'EUR'
            mrrMap[cur] = (mrrMap[cur] || 0) + sub.amount / intervalCount
          }
        }
        setActiveCount(active)
        setMrrByCurrency(mrrMap)
      })
      .catch(() => {})
      .finally(() => {
        setLoading(false)
        setStatsLoading(false)
      })
  }, [client, liveModeFilter])

  useEffect(() => {
    fetchSubscriptions()
  }, [fetchSubscriptions])

  // Cancel handler
  const handleCancelConfirm = useCallback(async () => {
    if (!cancelDialog.payment) return
    const subscriptionId = cancelDialog.payment.metadata?.subscriptionId as string | undefined
    if (!subscriptionId) {
      throw new Error('No subscription ID found')
    }
    await client.cancelSubscription(subscriptionId)
    fetchSubscriptions()
  }, [client, cancelDialog.payment, fetchSubscriptions])

  // Bulk cancel handler (test mode only)
  const handleCancelAll = useCallback(async () => {
    if (typeof window !== 'undefined' && !window.confirm(t.cancelAllConfirm)) return
    const activeSubscriptions = subscriptions.filter(s => s.status === 'completed')
    let count = 0
    for (const sub of activeSubscriptions) {
      const subscriptionId = sub.metadata?.subscriptionId as string | undefined
      if (!subscriptionId) continue
      try {
        await client.cancelSubscription(subscriptionId)
        count++
      } catch {
        // Skip individual failures
      }
    }
    toast.success(`${t.cancelAllSuccess} (${count}/${activeSubscriptions.length})`)
    fetchSubscriptions()
  }, [client, subscriptions, fetchSubscriptions, t])

  // Columns — App column always visible (auto-scoped server-side)
  const columns: ColumnDef<Payment>[] = useMemo(
    () => [
      {
        accessorKey: 'customerEmail',
        header: ({ header }) => <DataTableColumnHeader header={header} title={t.userHeader} />,
        cell: ({ row }) => (
          <Span className="text-sm">
            {row.original.customerEmail || row.original.userId || '-'}
          </Span>
        ),
      },
      {
        accessorKey: 'projectId',
        header: t.columnApp,
        cell: ({ row }: { row: { original: Payment } }) => (
          <Badge variant="outline" size="sm">
            {row.original.projectId || '-'}
          </Badge>
        ),
      },
      {
        accessorKey: 'planName',
        header: ({ header }) => <DataTableColumnHeader header={header} title={t.planHeader} />,
        cell: ({ row }) => (
          <Span className="text-sm font-medium">
            {(row.original.metadata?.planName as string) || '-'}
          </Span>
        ),
        enableSorting: false,
      },
      {
        accessorKey: 'amount',
        header: ({ header }) => <DataTableColumnHeader header={header} title={t.amountHeader} />,
        cell: ({ row }) => (
          <Span className="font-medium">
            {formatCurrency(row.original.amount, row.original.currency)}
          </Span>
        ),
      },
      {
        accessorKey: 'interval',
        header: ({ header }) => <DataTableColumnHeader header={header} title={t.intervalHeader} />,
        cell: ({ row }) => {
          const intervalCount = (row.original.metadata?.intervalCount as number | undefined) || 1
          return (
            <Span className="text-sm">
              {intervalCount > 1 ? `${intervalCount}x ` : ''}
              {t.monthly}
            </Span>
          )
        },
        enableSorting: false,
      },
      {
        accessorKey: 'status',
        header: ({ header }) => <DataTableColumnHeader header={header} title={t.statusHeader} />,
        cell: ({ row }) => (
          <Badge variant={STATUS_VARIANT[row.original.status]} size="sm" dot>
            {t[row.original.status] || row.original.status}
          </Badge>
        ),
      },
      {
        accessorKey: 'createdAt',
        header: ({ header }) => <DataTableColumnHeader header={header} title={t.startedHeader} />,
        cell: ({ row }) => (
          <Span className="text-sm">{formatDateShort(row.original.createdAt)}</Span>
        ),
      },
      {
        id: 'actions',
        header: t.actionsHeader,
        cell: ({ row }) => {
          const payment = row.original
          if (payment.status !== 'completed') return null
          return (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCancelDialog({ open: true, payment })}
            >
              {t.cancelSubscription}
            </Button>
          )
        },
      },
    ],
    [t]
  )

  return (
    <Div className="space-y-6">
      <Div className="flex items-center justify-between">
        <Div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
          <StatCard label={t.activeSubscriptions} value={activeCount} loading={statsLoading} />
          <StatCard
            label={t.mrr}
            value={
              Object.keys(mrrByCurrency).length === 0
                ? formatCurrency(0)
                : Object.entries(mrrByCurrency)
                    .map(([cur, amount]) => formatCurrency(amount, cur))
                    .join(' | ')
            }
            loading={statsLoading}
          />
        </Div>
        {testMode && (
          <Button variant="outline" size="sm" onClick={handleCancelAll} className="ml-4">
            {t.cancelAllSubscriptions}
          </Button>
        )}
      </Div>

      {/* Table */}
      {loading ? (
        <Card className="p-8">
          <Div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </Div>
        </Card>
      ) : subscriptions.length === 0 ? (
        <EmptyState message={t.noSubscriptions} />
      ) : (
        <DataTable columns={columns} data={subscriptions} pageSize={PAGE_SIZE} />
      )}

      {/* Cancel Dialog */}
      <ConfirmActionDialog
        open={cancelDialog.open}
        onOpenChange={open => setCancelDialog(prev => ({ ...prev, open }))}
        title={t.cancelSubscriptionTitle}
        description={t.cancelSubscriptionDescription}
        onConfirm={handleCancelConfirm}
        variant="destructive"
        texts={{
          confirmLabel: t.confirm,
          cancelLabel: t.cancel,
          loadingMessage: t.loading,
          successMessage: t.cancelSubscriptionSuccess,
          errorMessage: t.cancelSubscriptionError,
          retryLabel: t.retry,
          closeLabel: t.close,
        }}
      />
    </Div>
  )
}
