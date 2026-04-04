'use client'

import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useState } from 'react'
import {
  Badge,
  Button,
  Card,
  Div,
  H1,
  H2,
  Main,
  P,
  Span,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
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

interface PaymentsMeta {
  total: number
  limit: number
  offset: number
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
  const [meta, setMeta] = useState<PaymentsMeta>({ total: 0, limit: PAGE_SIZE, offset: 0 })
  const [paymentsLoading, setPaymentsLoading] = useState(true)

  // Filters
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [emailSearch, setEmailSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(0)

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
    params.set('limit', String(PAGE_SIZE))
    params.set('offset', String(currentPage * PAGE_SIZE))

    fetch(`${API_URL}/payments?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setPayments(data.data || [])
          setMeta(data.meta || { total: 0, limit: PAGE_SIZE, offset: 0 })
        }
      })
      .catch(() => {})
      .finally(() => setPaymentsLoading(false))
  }, [token, typeFilter, statusFilter, currentPage])

  useEffect(() => {
    fetchPayments()
  }, [fetchPayments])

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(0)
  }, [typeFilter, statusFilter, emailSearch])

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

  // ---- Filter payments by email (client-side) ----
  const filteredPayments = emailSearch
    ? payments.filter(p => p.customerEmail?.toLowerCase().includes(emailSearch.toLowerCase()))
    : payments

  // ---- Pagination ----
  const totalPages = Math.ceil(meta.total / PAGE_SIZE)
  const from = currentPage * PAGE_SIZE + 1
  const to = Math.min((currentPage + 1) * PAGE_SIZE, meta.total)

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

        <Input
          type="text"
          placeholder={t('filters.searchEmail')}
          value={emailSearch}
          onChange={e => setEmailSearch(e.target.value)}
          className="w-full sm:w-64"
        />
      </Div>

      {/* Payments Table */}
      <Card className="overflow-hidden">
        <Table variant="hoverable">
          <TableHeader>
            <TableRow>
              <TableHead>{t('table.date')}</TableHead>
              <TableHead>{t('table.type')}</TableHead>
              <TableHead>{t('table.client')}</TableHead>
              <TableHead>{t('table.amount')}</TableHead>
              <TableHead>{t('table.status')}</TableHead>
              <TableHead>{t('table.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paymentsLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : filteredPayments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <P className="text-center text-muted-foreground py-8">{t('table.noPayments')}</P>
                </TableCell>
              </TableRow>
            ) : (
              filteredPayments.map(payment => (
                <TableRow key={payment._id}>
                  <TableCell>
                    <Span className="text-sm">{formatDate(payment.createdAt)}</Span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={typeVariantMap[payment.type]} size="sm">
                      {t(`filters.${payment.type}`)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Span className="text-sm">{payment.customerEmail || '-'}</Span>
                  </TableCell>
                  <TableCell>
                    <Span className="font-medium">
                      {formatCurrency(payment.amount, payment.currency)}
                    </Span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariantMap[payment.status]} size="sm" dot>
                      {t(`filters.${payment.status}`)}
                    </Badge>
                  </TableCell>
                  <TableCell>
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
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Pagination */}
      {meta.total > 0 && (
        <Div className="flex flex-col sm:flex-row items-center justify-between mt-4 gap-3">
          <P className="text-sm text-muted-foreground">
            {t('pagination.showing', { from, to, total: meta.total })}
          </P>
          <Div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
              disabled={currentPage === 0}
            >
              {t('pagination.previous')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={currentPage >= totalPages - 1}
            >
              {t('pagination.next')}
            </Button>
          </Div>
        </Div>
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
          successMessage: t('table.refundSuccess'),
          errorMessage: t('table.refundError'),
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
          successMessage: t('table.cancelSuccess'),
          errorMessage: t('table.cancelError'),
        }}
      />
    </Main>
  )
}
