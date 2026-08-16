'use client'

import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Badge,
  Button,
  Card,
  ConfirmActionDialog,
  Div,
  Input,
  P,
  Span,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  DataTable,
  DataTableColumnHeader,
  type ColumnDef,
} from '@ezstart/ui/components'
import { apiCall, ApiError } from '@ezstart/api-sdk'

// ========================================
// Types
// ========================================

type PaymentType = 'donation' | 'purchase' | 'subscription' | 'invoice'
type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded' | 'cancelled'

interface Payment {
  _id: string
  paymentId: string
  type: PaymentType
  status: PaymentStatus
  amount: number
  currency: string
  customerEmail?: string
  userId?: string
  projectId?: string
  metadata?: Record<string, unknown>
  createdAt: string
}

interface GlobalStats {
  totalRevenue: number
  totalCount: number
  byType: Record<string, { total: number; count: number }>
}

// ========================================
// Constants
// ========================================

const PAGE_SIZE = 20

// ========================================
// Helpers
// ========================================

function formatCurrency(amount: number, currency = 'eur'): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount)
}

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(dateStr))
}

// ========================================
// Status badge variant mapping
// ========================================

const statusVariantMap: Record<
  PaymentStatus,
  'success' | 'warning' | 'destructive' | 'info' | 'secondary'
> = {
  completed: 'success',
  pending: 'warning',
  failed: 'destructive',
  refunded: 'info',
  cancelled: 'secondary',
}

const typeVariantMap: Record<PaymentType, 'purple' | 'cyan' | 'indigo' | 'pink'> = {
  donation: 'purple',
  purchase: 'cyan',
  subscription: 'indigo',
  invoice: 'pink',
}

// ========================================
// Component
// ========================================

export function EZPayTab() {
  const t = useTranslations('admin.ezpay')
  const td = useTranslations('admin.dialog')

  // Stats state
  const [stats, setStats] = useState<GlobalStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)

  // Payments state
  const [payments, setPayments] = useState<Payment[]>([])
  const [paymentsLoading, setPaymentsLoading] = useState(true)

  // Filters
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Refund dialog state
  const [refundDialog, setRefundDialog] = useState<{ open: boolean; paymentId: string | null }>({
    open: false,
    paymentId: null,
  })

  // Cancel subscription dialog state
  const [cancelDialog, setCancelDialog] = useState<{
    open: boolean
    payment: Payment | null
  }>({ open: false, payment: null })

  // ---- Debounced search ----
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

  // ---- Fetch stats (from all payments) ----
  useEffect(() => {
    setStatsLoading(true)
    apiCall<Payment[]>('/payments', {
      appName: 'ezpay',
      method: 'GET',
      query: { limit: 1000 },
    })
      .then((allPayments: Payment[]) => {
        const list: Payment[] = Array.isArray(allPayments) ? allPayments : []
        const byType: Record<string, { total: number; count: number }> = {}
        let totalRevenue = 0
        for (const p of list) {
          if (p.status === 'completed') {
            totalRevenue += p.amount
          }
          if (!byType[p.type]) {
            byType[p.type] = { total: 0, count: 0 }
          }
          const entry = byType[p.type]!
          entry.count += 1
          if (p.status === 'completed') {
            entry.total += p.amount
          }
        }
        setStats({
          totalRevenue,
          totalCount: list.length,
          byType,
        })
      })
      .catch(() => {})
      .finally(() => setStatsLoading(false))
  }, [])

  // ---- Fetch payments ----
  const fetchPayments = useCallback(() => {
    setPaymentsLoading(true)

    const query: Record<string, string | number> = { limit: 1000 }
    if (typeFilter !== 'all') query.type = typeFilter
    if (statusFilter !== 'all') query.status = statusFilter
    if (searchQuery) query.search = searchQuery

    apiCall<Payment[]>('/payments', {
      appName: 'ezpay',
      method: 'GET',
      query,
    })
      .then((list: Payment[]) => setPayments(Array.isArray(list) ? list : []))
      .catch(() => {})
      .finally(() => setPaymentsLoading(false))
  }, [typeFilter, statusFilter, searchQuery])

  useEffect(() => {
    fetchPayments()
  }, [fetchPayments])

  // ---- Refund handler ----
  const handleRefundConfirm = useCallback(async () => {
    if (!refundDialog.paymentId) return
    try {
      await apiCall(`/payments/${refundDialog.paymentId}/refund`, {
        appName: 'ezpay',
        method: 'POST',
      })
    } catch (err: unknown) {
      const message =
        ApiError.isApiError(err) || err instanceof Error ? err.message : t('table.refundError')
      throw new Error(message)
    }
    fetchPayments()
  }, [refundDialog.paymentId, fetchPayments, t])

  // ---- Cancel subscription handler ----
  const handleCancelConfirm = useCallback(async () => {
    if (!cancelDialog.payment) return
    const subscriptionId = cancelDialog.payment.metadata?.subscriptionId
    if (!subscriptionId) {
      throw new Error(t('table.cancelNoId'))
    }
    try {
      await apiCall(`/subscriptions/${subscriptionId}/cancel`, {
        appName: 'ezpay',
        method: 'POST',
      })
    } catch (err: unknown) {
      const message =
        ApiError.isApiError(err) || err instanceof Error ? err.message : t('table.cancelError')
      throw new Error(message)
    }
    fetchPayments()
  }, [cancelDialog.payment, fetchPayments, t])

  // ---- DataTable columns ----
  const columns: ColumnDef<Payment>[] = [
    {
      accessorKey: 'createdAt',
      header: ({ header }) => <DataTableColumnHeader header={header} title={t('table.date')} />,
      cell: ({ row }) => <Span className="text-sm">{formatDate(row.original.createdAt)}</Span>,
    },
    {
      accessorKey: 'type',
      header: ({ header }) => <DataTableColumnHeader header={header} title={t('table.type')} />,
      cell: ({ row }) => (
        <Badge variant={typeVariantMap[row.original.type]} size="sm">
          {t(`filters.${row.original.type}`)}
        </Badge>
      ),
    },
    {
      accessorKey: 'customerEmail',
      header: ({ header }) => <DataTableColumnHeader header={header} title={t('table.client')} />,
      cell: ({ row }) => <Span className="text-sm">{row.original.customerEmail || '-'}</Span>,
    },
    {
      accessorKey: 'amount',
      header: ({ header }) => <DataTableColumnHeader header={header} title={t('table.amount')} />,
      cell: ({ row }) => (
        <Span className="font-medium">
          {formatCurrency(row.original.amount, row.original.currency)}
        </Span>
      ),
    },
    {
      accessorKey: 'status',
      header: ({ header }) => <DataTableColumnHeader header={header} title={t('table.status')} />,
      cell: ({ row }) => (
        <Badge variant={statusVariantMap[row.original.status]} size="sm" dot>
          {t(`filters.${row.original.status}`)}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: t('table.actions'),
      cell: ({ row }) => {
        const payment = row.original
        return (
          <Div className="flex gap-1">
            {payment.status === 'completed' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRefundDialog({ open: true, paymentId: payment._id })}
              >
                {t('table.refund')}
              </Button>
            )}
            {payment.type === 'subscription' &&
              (payment.status === 'completed' || payment.status === 'pending') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCancelDialog({ open: true, payment })}
                >
                  {t('table.cancelSubscription')}
                </Button>
              )}
          </Div>
        )
      },
    },
  ]

  return (
    <Div className="space-y-6">
      {/* Stats Cards */}
      <Div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6">
          <P className="text-sm text-muted-foreground mb-1">{t('stats.totalRevenue')}</P>
          {statsLoading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <P className="text-2xl font-bold">{formatCurrency(stats?.totalRevenue ?? 0)}</P>
          )}
        </Card>
        <Card className="p-6">
          <P className="text-sm text-muted-foreground mb-1">{t('stats.totalPayments')}</P>
          {statsLoading ? (
            <Skeleton className="h-8 w-16" />
          ) : (
            <P className="text-2xl font-bold">{stats?.totalCount ?? 0}</P>
          )}
        </Card>
        <Card className="p-6">
          <P className="text-sm text-muted-foreground mb-1">{t('stats.donations')}</P>
          {statsLoading ? (
            <Skeleton className="h-8 w-16" />
          ) : (
            <P className="text-2xl font-bold">{stats?.byType?.donation?.count ?? 0}</P>
          )}
        </Card>
        <Card className="p-6">
          <P className="text-sm text-muted-foreground mb-1">{t('stats.purchases')}</P>
          {statsLoading ? (
            <Skeleton className="h-8 w-16" />
          ) : (
            <P className="text-2xl font-bold">{stats?.byType?.purchase?.count ?? 0}</P>
          )}
        </Card>
      </Div>

      {/* Filters */}
      <Div className="flex flex-col sm:flex-row gap-3">
        <Input
          placeholder={t('filters.searchEmail')}
          value={searchInput}
          onChange={e => handleSearchChange(e.target.value)}
          className="w-full sm:w-64"
        />

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder={t('filters.allTypes')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('filters.allTypes')}</SelectItem>
            <SelectItem value="donation">{t('filters.donation')}</SelectItem>
            <SelectItem value="purchase">{t('filters.purchase')}</SelectItem>
            <SelectItem value="subscription">{t('filters.subscription')}</SelectItem>
            <SelectItem value="invoice">{t('filters.invoice')}</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder={t('filters.allStatuses')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('filters.allStatuses')}</SelectItem>
            <SelectItem value="pending">{t('filters.pending')}</SelectItem>
            <SelectItem value="completed">{t('filters.completed')}</SelectItem>
            <SelectItem value="failed">{t('filters.failed')}</SelectItem>
            <SelectItem value="refunded">{t('filters.refunded')}</SelectItem>
            <SelectItem value="cancelled">{t('filters.cancelled')}</SelectItem>
          </SelectContent>
        </Select>
      </Div>

      {/* Payments DataTable */}
      {paymentsLoading ? (
        <Card className="p-8">
          <Div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </Div>
        </Card>
      ) : (
        <DataTable columns={columns} data={payments} pageSize={PAGE_SIZE} />
      )}

      {/* Refund Confirmation Dialog */}
      <ConfirmActionDialog
        open={refundDialog.open}
        onOpenChange={(open: boolean) => setRefundDialog(prev => ({ ...prev, open }))}
        title={t('table.refund')}
        description={t('table.refundConfirm')}
        onConfirm={handleRefundConfirm}
        variant="destructive"
        texts={{
          confirmLabel: td('confirm'),
          cancelLabel: td('cancel'),
          loadingMessage: td('loading'),
          successMessage: t('table.refundSuccess'),
          errorMessage: t('table.refundError'),
          retryLabel: td('retry'),
          closeLabel: td('close'),
        }}
      />

      {/* Cancel Subscription Confirmation Dialog */}
      <ConfirmActionDialog
        open={cancelDialog.open}
        onOpenChange={(open: boolean) => setCancelDialog(prev => ({ ...prev, open }))}
        title={t('table.cancelSubscription')}
        description={t('table.cancelConfirm')}
        onConfirm={handleCancelConfirm}
        variant="destructive"
        texts={{
          confirmLabel: td('confirm'),
          cancelLabel: td('cancel'),
          loadingMessage: td('loading'),
          successMessage: t('table.cancelSuccess'),
          errorMessage: t('table.cancelError'),
          retryLabel: td('retry'),
          closeLabel: td('close'),
        }}
      />
    </Div>
  )
}
