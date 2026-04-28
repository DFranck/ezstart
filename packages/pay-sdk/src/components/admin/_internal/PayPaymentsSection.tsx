'use client'

/**
 * Payments tab content for `<PayAdminDashboard>`.
 *
 * Auto-scoped server-side via JWT. The component does not pass `scope` /
 * `appName` / `applicationId` filters — the API derives them from the caller.
 *
 * @internal
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Badge,
  Button,
  Card,
  DataTable,
  DataTableColumnHeader,
  Div,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Span,
  type ColumnDef,
} from '@ezstart/ui/components'
import { toast } from '@ezstart/ui/utils'
import type { Payment } from '../../../core/types.js'
import { formatCurrency } from '../../../core/format-currency.js'
import { usePayContext } from '../../../react/pay-provider.js'
import { ConfirmActionDialog } from '../../ConfirmActionDialog.js'
import type { PayPaymentsSectionTexts } from './types.js'
import { PAGE_SIZE, STATUS_VARIANT, TYPE_VARIANT, formatDate } from './helpers.js'
import { EmptyState, StatCard } from './primitives.js'

export const DEFAULT_PAYMENTS_TEXTS: Required<PayPaymentsSectionTexts> = {
  totalRevenue: 'Total Revenue',
  totalPayments: 'Total Payments',
  completedPayments: 'Completed',
  failedPayments: 'Failed',
  allTypes: 'All types',
  allStatuses: 'All statuses',
  searchPlaceholder: 'Search by email...',
  donation: 'Donation',
  purchase: 'Purchase',
  subscription: 'Subscription',
  invoice: 'Invoice',
  testimonial: 'Testimonial',
  completed: 'Completed',
  pending: 'Pending',
  failed: 'Failed',
  refunded: 'Refunded',
  cancelled: 'Cancelled',
  dateHeader: 'Date',
  userHeader: 'User',
  typeHeader: 'Type',
  amountHeader: 'Amount',
  statusHeader: 'Status',
  actionsHeader: 'Actions',
  columnApp: 'App',
  refund: 'Refund',
  refundTitle: 'Refund Payment',
  refundDescription: 'Are you sure you want to refund this payment? This action cannot be undone.',
  refundSuccess: 'Payment refunded successfully',
  refundError: 'Failed to refund payment',
  refundAllCompleted: 'Refund All Completed',
  refundAllConfirm: 'Refund ALL completed payments? This cannot be undone.',
  refundAllSuccess: 'Bulk refund completed',
  noPayments: 'No payments found.',
  confirm: 'Confirm',
  cancel: 'Cancel',
  loading: 'Processing...',
  close: 'Close',
  retry: 'Retry',
}

interface PayPaymentsSectionProps {
  texts: Required<PayPaymentsSectionTexts>
  testMode?: boolean
}

export function PayPaymentsSection({ texts: t, testMode }: PayPaymentsSectionProps) {
  const { client } = usePayContext()

  const [payments, setPayments] = useState<Payment[]>([])
  const [totalPayments, setTotalPayments] = useState(0)
  const [loading, setLoading] = useState(true)
  const [statsLoading, setStatsLoading] = useState(true)

  // Stats
  const [revenueByCurrency, setRevenueByCurrency] = useState<Record<string, number>>({})
  const [completedCount, setCompletedCount] = useState(0)
  const [failedCount, setFailedCount] = useState(0)

  // Filters
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Refund dialog
  const [refundDialog, setRefundDialog] = useState<{
    open: boolean
    paymentId: string | null
  }>({ open: false, paymentId: null })

  // Debounced search
  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value)
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => {
      setSearchQuery(value)
    }, 400)
  }, [])

  useEffect(() => {
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    }
  }, [])

  // Derive liveMode filter from testMode prop
  const liveModeFilter = testMode === true ? 'false' : testMode === false ? 'true' : undefined

  // Fetch stats
  useEffect(() => {
    setStatsLoading(true)
    client
      .getPayments({ limit: 100, liveMode: liveModeFilter })
      .then(result => {
        // Filter out subscriptions — they have their own tab
        const nonSubPayments = result.payments.filter(p => p.type !== 'subscription')
        const revenueMap: Record<string, number> = {}
        let completed = 0
        let failed = 0
        for (const p of nonSubPayments) {
          if (p.status === 'completed') {
            const cur = p.currency || 'EUR'
            revenueMap[cur] = (revenueMap[cur] || 0) + p.amount
            completed++
          }
          if (p.status === 'failed') {
            failed++
          }
        }
        setRevenueByCurrency(revenueMap)
        setTotalPayments(nonSubPayments.length)
        setCompletedCount(completed)
        setFailedCount(failed)
      })
      .catch(() => {})
      .finally(() => setStatsLoading(false))
  }, [client, liveModeFilter])

  // Fetch payments
  const fetchPayments = useCallback(() => {
    setLoading(true)
    const params: Record<string, string | number | undefined> = {
      limit: 100,
      liveMode: liveModeFilter,
    }
    if (typeFilter !== 'all') params.type = typeFilter
    if (statusFilter !== 'all') params.status = statusFilter

    client
      .getPayments(params as Parameters<typeof client.getPayments>[0])
      .then(result => {
        // Filter out subscriptions — they have their own tab
        let filtered = result.payments.filter(p => p.type !== 'subscription')
        if (searchQuery) {
          const q = searchQuery.toLowerCase()
          filtered = filtered.filter(
            p =>
              p.customerEmail?.toLowerCase().includes(q) ||
              p.customerName?.toLowerCase().includes(q) ||
              p.paymentId?.toLowerCase().includes(q)
          )
        }
        setPayments(filtered)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [client, typeFilter, statusFilter, searchQuery, liveModeFilter])

  useEffect(() => {
    fetchPayments()
  }, [fetchPayments])

  // Refund handler
  const handleRefundConfirm = useCallback(async () => {
    if (!refundDialog.paymentId) return
    await client.refundPayment(refundDialog.paymentId)
    fetchPayments()
  }, [client, refundDialog.paymentId, fetchPayments])

  // Bulk refund handler (test mode only)
  const handleRefundAll = useCallback(async () => {
    if (typeof window !== 'undefined' && !window.confirm(t.refundAllConfirm)) return
    const completedPayments = payments.filter(p => p.status === 'completed')
    let count = 0
    for (const payment of completedPayments) {
      try {
        await client.refundPayment(payment.id)
        count++
      } catch {
        // Skip individual failures
      }
    }
    toast.success(`${t.refundAllSuccess} (${count}/${completedPayments.length})`)
    fetchPayments()
  }, [client, payments, fetchPayments, t])

  // Columns — App column always visible (auto-scoped server-side; useful in
  // both per-app and platform views).
  const columns: ColumnDef<Payment>[] = useMemo(
    () => [
      {
        accessorKey: 'createdAt',
        header: ({ header }) => <DataTableColumnHeader header={header} title={t.dateHeader} />,
        cell: ({ row }) => <Span className="text-sm">{formatDate(row.original.createdAt)}</Span>,
      },
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
        accessorKey: 'type',
        header: ({ header }) => <DataTableColumnHeader header={header} title={t.typeHeader} />,
        cell: ({ row }) => (
          <Badge variant={TYPE_VARIANT[row.original.type]} size="sm">
            {t[row.original.type] || row.original.type}
          </Badge>
        ),
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
        accessorKey: 'status',
        header: ({ header }) => <DataTableColumnHeader header={header} title={t.statusHeader} />,
        cell: ({ row }) => (
          <Badge variant={STATUS_VARIANT[row.original.status]} size="sm" dot>
            {t[row.original.status] || row.original.status}
          </Badge>
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
              onClick={() => setRefundDialog({ open: true, paymentId: payment.id })}
            >
              {t.refund}
            </Button>
          )
        },
      },
    ],
    [t]
  )

  return (
    <Div className="space-y-6">
      {/* Stats */}
      <Div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label={t.totalRevenue}
          value={
            Object.keys(revenueByCurrency).length === 0
              ? formatCurrency(0)
              : Object.entries(revenueByCurrency)
                  .map(([cur, amount]) => formatCurrency(amount, cur))
                  .join(' | ')
          }
          loading={statsLoading}
        />
        <StatCard label={t.totalPayments} value={totalPayments} loading={statsLoading} />
        <StatCard label={t.completedPayments} value={completedCount} loading={statsLoading} />
        <StatCard label={t.failedPayments} value={failedCount} loading={statsLoading} />
      </Div>

      {/* Filters */}
      <Div className="flex flex-col sm:flex-row gap-3">
        <Input
          placeholder={t.searchPlaceholder}
          value={searchInput}
          onChange={e => handleSearchChange(e.target.value)}
          className="w-full sm:w-64"
        />

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder={t.allTypes} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.allTypes}</SelectItem>
            <SelectItem value="donation">{t.donation}</SelectItem>
            <SelectItem value="purchase">{t.purchase}</SelectItem>
            <SelectItem value="invoice">{t.invoice}</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder={t.allStatuses} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.allStatuses}</SelectItem>
            <SelectItem value="pending">{t.pending}</SelectItem>
            <SelectItem value="completed">{t.completed}</SelectItem>
            <SelectItem value="failed">{t.failed}</SelectItem>
            <SelectItem value="refunded">{t.refunded}</SelectItem>
            <SelectItem value="cancelled">{t.cancelled}</SelectItem>
          </SelectContent>
        </Select>

        {testMode && (
          <Button variant="outline" size="sm" onClick={handleRefundAll} className="sm:ml-auto">
            {t.refundAllCompleted}
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
      ) : payments.length === 0 ? (
        <EmptyState message={t.noPayments} />
      ) : (
        <DataTable columns={columns} data={payments} pageSize={PAGE_SIZE} />
      )}

      {/* Refund Dialog */}
      <ConfirmActionDialog
        open={refundDialog.open}
        onOpenChange={open => setRefundDialog(prev => ({ ...prev, open }))}
        title={t.refundTitle}
        description={t.refundDescription}
        onConfirm={handleRefundConfirm}
        variant="destructive"
        texts={{
          confirmLabel: t.confirm,
          cancelLabel: t.cancel,
          loadingMessage: t.loading,
          successMessage: t.refundSuccess,
          errorMessage: t.refundError,
          retryLabel: t.retry,
          closeLabel: t.close,
        }}
      />
    </Div>
  )
}
