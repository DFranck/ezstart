'use client'

import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useState } from 'react'
import {
  Badge,
  Button,
  Card,
  Div,
  H1,
  Main,
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
import { ConfirmActionDialog } from '@ezstart/pay-sdk'

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

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:6130'
const PAGE_SIZE = 20

// ========================================
// Helpers
// ========================================

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem('ezauth-storage')
    if (raw) {
      const parsed = JSON.parse(raw)
      return parsed?.state?.accessToken || null
    }
  } catch {}
  return null
}

function isAdmin(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const raw = localStorage.getItem('ezauth-storage')
    if (raw) {
      const parsed = JSON.parse(raw)
      const user = parsed?.state?.user
      if (!user) return false
      return (
        user.globalRoles?.includes('superadmin') ||
        user.globalRoles?.includes('admin') ||
        user.appRoles?.ezpay?.includes('admin') ||
        false
      )
    }
  } catch {}
  return false
}

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

export default function AdminPage() {
  const t = useTranslations('admin')

  // Auth state
  const [token, setToken] = useState<string | null>(null)
  const [authChecked, setAuthChecked] = useState(false)

  // Stats state
  const [stats, setStats] = useState<GlobalStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)

  // Payments state
  const [payments, setPayments] = useState<Payment[]>([])
  const [paymentsLoading, setPaymentsLoading] = useState(true)

  // Filters
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Refund dialog state
  const [refundDialog, setRefundDialog] = useState<{ open: boolean; paymentId: string | null }>({
    open: false,
    paymentId: null,
  })

  // Cancel subscription dialog state
  const [cancelDialog, setCancelDialog] = useState<{
    open: boolean
    payment: (Payment & { metadata?: Record<string, any> }) | null
  }>({ open: false, payment: null })

  // ---- Auth check ----
  useEffect(() => {
    setToken(getToken())
    setAuthChecked(true)
  }, [])

  // ---- Fetch stats (from all payments) ----
  useEffect(() => {
    if (!token) return
    setStatsLoading(true)
    fetch(`${API_URL}/payments?limit=1000`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          const allPayments: Payment[] = data.data || []
          const byType: Record<string, { total: number; count: number }> = {}
          let totalRevenue = 0
          for (const p of allPayments) {
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
            totalCount: allPayments.length,
            byType,
          })
        }
      })
      .catch(() => {})
      .finally(() => setStatsLoading(false))
  }, [token])

  // ---- Fetch payments ----
  const fetchPayments = useCallback(() => {
    if (!token) return
    setPaymentsLoading(true)

    const params = new URLSearchParams()
    if (typeFilter !== 'all') params.set('type', typeFilter)
    if (statusFilter !== 'all') params.set('status', statusFilter)
    params.set('limit', '1000')

    fetch(`${API_URL}/payments?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setPayments(data.data || [])
        }
      })
      .catch(() => {})
      .finally(() => setPaymentsLoading(false))
  }, [token, typeFilter, statusFilter])

  useEffect(() => {
    fetchPayments()
  }, [fetchPayments])

  // ---- Refund handler ----
  const handleRefundConfirm = useCallback(async () => {
    if (!token || !refundDialog.paymentId) return
    const res = await fetch(`${API_URL}/payments/${refundDialog.paymentId}/refund`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json()
    if (!data.success) {
      throw new Error(data.error || t('table.refundError'))
    }
    fetchPayments()
  }, [token, refundDialog.paymentId, fetchPayments, t])

  // ---- Cancel subscription handler ----
  const handleCancelConfirm = useCallback(async () => {
    if (!token || !cancelDialog.payment) return
    const subscriptionId = cancelDialog.payment.metadata?.subscriptionId
    if (!subscriptionId) {
      throw new Error(t('table.cancelNoId'))
    }
    const res = await fetch(`${API_URL}/subscriptions/${subscriptionId}/cancel`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json()
    if (!data.success) {
      throw new Error(data.error || t('table.cancelError'))
    }
    fetchPayments()
  }, [token, cancelDialog.payment, fetchPayments, t])

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
                  onClick={() =>
                    setCancelDialog({
                      open: true,
                      payment: payment as Payment & { metadata?: Record<string, any> },
                    })
                  }
                >
                  {t('table.cancelSubscription')}
                </Button>
              )}
          </Div>
        )
      },
    },
  ]

  // ---- Auth guard ----
  if (!authChecked) return null
  if (!token || !isAdmin()) {
    return (
      <Main className="container mx-auto py-12 px-4">
        <Div className="max-w-md mx-auto text-center">
          <Card className="p-8">
            <H1 className="text-2xl font-bold mb-4">{t('accessRequired')}</H1>
            <P className="text-muted-foreground">{t('accessRequiredDescription')}</P>
          </Card>
        </Div>
      </Main>
    )
  }

  return (
    <Main className="container mx-auto py-8 px-4">
      {/* Header */}
      <Div className="mb-8">
        <H1 className="text-3xl font-bold">{t('title')}</H1>
      </Div>

      {/* Stats Cards */}
      <Div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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
      <Div className="flex flex-col sm:flex-row gap-3 mb-6">
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
        <DataTable
          columns={columns}
          data={payments}
          filterColumn="customerEmail"
          filterPlaceholder={t('filters.searchEmail')}
          pageSize={PAGE_SIZE}
        />
      )}

      {/* Refund Confirmation Dialog */}
      <ConfirmActionDialog
        open={refundDialog.open}
        onOpenChange={open => setRefundDialog(prev => ({ ...prev, open }))}
        title={t('table.refund')}
        description={t('table.refundConfirm')}
        onConfirm={handleRefundConfirm}
        variant="destructive"
        texts={{
          confirmLabel: t('dialog.confirm'),
          cancelLabel: t('dialog.cancel'),
          loadingMessage: t('dialog.loading'),
          successMessage: t('table.refundSuccess'),
          errorMessage: t('table.refundError'),
          retryLabel: t('dialog.retry'),
          closeLabel: t('dialog.close'),
        }}
      />

      {/* Cancel Subscription Confirmation Dialog */}
      <ConfirmActionDialog
        open={cancelDialog.open}
        onOpenChange={open => setCancelDialog(prev => ({ ...prev, open }))}
        title={t('table.cancelSubscription')}
        description={t('table.cancelConfirm')}
        onConfirm={handleCancelConfirm}
        variant="destructive"
        texts={{
          confirmLabel: t('dialog.confirm'),
          cancelLabel: t('dialog.cancel'),
          loadingMessage: t('dialog.loading'),
          successMessage: t('table.cancelSuccess'),
          errorMessage: t('table.cancelError'),
          retryLabel: t('dialog.retry'),
          closeLabel: t('dialog.close'),
        }}
      />
    </Main>
  )
}
