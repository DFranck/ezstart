'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Badge,
  Button,
  Card,
  DataTable,
  DataTableColumnHeader,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Div,
  Icon,
  Input,
  Label,
  P,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Span,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  type ColumnDef,
} from '@ezstart/ui/components'
import { toast } from '@ezstart/ui/utils'
import type { Payment, PaymentStatus, PaymentType, Plan, Promo, PromoDiscountType, PromoDuration } from '../types.js'
import { formatCurrency } from '../utils/format-currency.js'
import { usePayContext } from '../provider.js'
import { ConfirmActionDialog } from './ConfirmActionDialog.js'

// ========================================
// Types
// ========================================

export interface PayAdminDashboardTexts {
  // Tabs
  paymentsTab?: string
  subscriptionsTab?: string
  promosTab?: string

  // Stats
  totalRevenue?: string
  totalPayments?: string
  completedPayments?: string
  failedPayments?: string
  activeSubscriptions?: string
  mrr?: string
  totalPromos?: string
  activePromos?: string
  totalUses?: string

  // Payment table headers
  dateHeader?: string
  userHeader?: string
  typeHeader?: string
  amountHeader?: string
  statusHeader?: string
  actionsHeader?: string

  // Subscription table headers
  planHeader?: string
  intervalHeader?: string
  startedHeader?: string

  // Promo table headers
  codeHeader?: string
  discountHeader?: string
  durationHeader?: string
  usesHeader?: string
  expiryHeader?: string

  // Filters
  allTypes?: string
  allStatuses?: string
  searchPlaceholder?: string

  // Payment types
  donation?: string
  purchase?: string
  subscription?: string
  invoice?: string

  // Payment statuses
  completed?: string
  pending?: string
  failed?: string
  refunded?: string
  cancelled?: string

  // Subscription intervals
  monthly?: string

  // Actions
  refund?: string
  refundTitle?: string
  refundDescription?: string
  refundSuccess?: string
  refundError?: string
  cancelSubscription?: string
  cancelSubscriptionTitle?: string
  cancelSubscriptionDescription?: string
  cancelSubscriptionSuccess?: string
  cancelSubscriptionError?: string

  // Promo actions
  createPromo?: string
  createPromoTitle?: string
  deletePromo?: string
  deletePromoTitle?: string
  deletePromoDescription?: string
  createPromoSuccess?: string
  createPromoError?: string
  deletePromoSuccess?: string
  deletePromoError?: string
  togglePromoSuccess?: string
  togglePromoError?: string

  // Promo form labels
  promoCode?: string
  promoAppName?: string
  promoDiscountType?: string
  promoDiscountValue?: string
  promoCurrency?: string
  promoDuration?: string
  promoDurationInMonths?: string
  promoMaxUses?: string
  promoExpiryDate?: string
  promoDiscountPercent?: string
  promoDiscountFixed?: string
  promoDurationOnce?: string
  promoDurationRepeating?: string
  promoDurationForever?: string
  promoActive?: string
  promoInactive?: string
  promoNoExpiry?: string
  promoOptional?: string
  promoUnlimitedHint?: string
  promoRequired?: string
  promoOptionalSection?: string

  // Promo form hints
  promoDiscountTypeHintPercent?: string
  promoDiscountTypeHintFixed?: string
  promoDurationHintOnce?: string
  promoDurationHintRepeating?: string
  promoDurationHintForever?: string
  promoDiscountValueHintPercent?: string
  promoDiscountValueHintFixed?: string
  promoMaxUsesHint?: string

  // Dialog common
  confirm?: string
  cancel?: string
  loading?: string
  close?: string
  retry?: string
  save?: string
  create?: string

  // Plan stats
  totalPlans?: string
  activePlans?: string

  // Plan table headers
  planNameHeader?: string
  planPriceHeader?: string
  planIntervalHeader?: string
  planFeaturesHeader?: string

  // Plan actions
  createPlan?: string
  createPlanTitle?: string
  deletePlan?: string
  deletePlanTitle?: string
  deletePlanDescription?: string
  createPlanSuccess?: string
  createPlanError?: string
  deletePlanSuccess?: string
  deletePlanError?: string
  togglePlanSuccess?: string
  togglePlanError?: string
  updatePlanSuccess?: string
  updatePlanError?: string

  // Plan form labels
  planName?: string
  planDescription?: string
  planAmount?: string
  planCurrency?: string
  planInterval?: string
  planIntervalCount?: string
  planFeatures?: string
  planSortOrder?: string
  planIntervalMonth?: string
  planIntervalYear?: string

  // Plan form hints
  planAmountHint?: string
  planIntervalCountHint?: string
  planFeaturesHint?: string

  // Plan section labels
  plansSection?: string
  activeSubscriptionsSection?: string

  // Plan empty
  noPlans?: string

  // App filter
  allApps?: string
  appFilterLabel?: string

  // Empty states
  noPayments?: string
  noSubscriptions?: string
  noPromos?: string

  // Test mode bulk actions
  testModeWarning?: string
  refundAllCompleted?: string
  refundAllConfirm?: string
  refundAllSuccess?: string
  cancelAllSubscriptions?: string
  cancelAllConfirm?: string
  cancelAllSuccess?: string
}

export interface PayAdminDashboardProps {
  appName: string
  showAppFilter?: boolean
  testMode?: boolean
  className?: string
  texts?: Partial<PayAdminDashboardTexts>
}

// ========================================
// Constants
// ========================================

const PAGE_SIZE = 20

const STATUS_VARIANT: Record<
  PaymentStatus,
  'success' | 'warning' | 'destructive' | 'info' | 'secondary'
> = {
  completed: 'success',
  pending: 'warning',
  failed: 'destructive',
  refunded: 'info',
  cancelled: 'secondary',
}

const TYPE_VARIANT: Record<PaymentType, 'purple' | 'cyan' | 'indigo' | 'pink'> = {
  donation: 'purple',
  purchase: 'cyan',
  subscription: 'indigo',
  invoice: 'pink',
}

// ========================================
// Helpers
// ========================================

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(dateStr))
}

function formatDateShort(dateStr: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
  }).format(new Date(dateStr))
}

// ========================================
// Sub-components
// ========================================

function StatCard({
  label,
  value,
  loading,
}: {
  label: string
  value: string | number
  loading: boolean
}) {
  return (
    <Card className="p-6">
      <P className="text-sm text-muted-foreground mb-1">{label}</P>
      {loading ? (
        <Skeleton className="h-8 w-24" />
      ) : (
        <P className="text-2xl font-bold">{value}</P>
      )}
    </Card>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <Div className="flex flex-col items-center justify-center gap-4 p-12 rounded-lg border-2 border-dashed border-muted-foreground/20">
      <Icon name="lucide:Receipt" className="w-12 h-12 text-muted-foreground/40" />
      <P className="text-muted-foreground text-center">{message}</P>
    </Div>
  )
}

// ========================================
// Payments Tab
// ========================================

function PaymentsTab({
  appName,
  t,
  testMode,
}: {
  appName: string
  t: Required<PayAdminDashboardTexts>
  testMode?: boolean
}) {
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

  // Fetch stats
  useEffect(() => {
    setStatsLoading(true)
    client
      .getPayments({ limit: 100 })
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
  }, [client])

  // Fetch payments
  const fetchPayments = useCallback(() => {
    setLoading(true)
    const params: Record<string, string | number | undefined> = {
      limit: 100,
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
  }, [client, typeFilter, statusFilter, searchQuery])

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
    if (!window.confirm(t.refundAllConfirm)) return
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

  // Columns
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
          <Span className="text-sm">{row.original.customerEmail || row.original.userId || '-'}</Span>
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

// ========================================
// Subscriptions Tab
// ========================================

function SubscriptionsTab({
  appName,
  t,
  testMode,
}: {
  appName: string
  t: Required<PayAdminDashboardTexts>
  testMode?: boolean
}) {
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

  // Fetch subscriptions
  const fetchSubscriptions = useCallback(() => {
    setLoading(true)
    setStatsLoading(true)
    client
      .getSubscriptions({ limit: 100 })
      .then(result => {
        setSubscriptions(result.payments)
        let active = 0
        const mrrMap: Record<string, number> = {}
        for (const sub of result.payments) {
          if (sub.status === 'completed') {
            active++
            const intervalCount =
              (sub.metadata?.intervalCount as number | undefined) || 1
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
  }, [client])

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
    if (!window.confirm(t.cancelAllConfirm)) return
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

  // Columns
  const columns: ColumnDef<Payment>[] = useMemo(
    () => [
      {
        accessorKey: 'customerEmail',
        header: ({ header }) => <DataTableColumnHeader header={header} title={t.userHeader} />,
        cell: ({ row }) => (
          <Span className="text-sm">{row.original.customerEmail || row.original.userId || '-'}</Span>
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
          const intervalCount =
            (row.original.metadata?.intervalCount as number | undefined) || 1
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
    <Div className="space-y-8">
      {/* Plans Section */}
      <Div>
        <P className="text-lg font-semibold mb-4">{t.plansSection}</P>
        <PlansSection appName={appName} t={t} />
      </Div>

      {/* Divider */}
      <Div className="border-t border-border" />

      {/* Active Subscriptions Section */}
      <Div>
        <Div className="flex items-center justify-between mb-4">
          <P className="text-lg font-semibold">{t.activeSubscriptionsSection}</P>
          {testMode && (
            <Button variant="outline" size="sm" onClick={handleCancelAll}>
              {t.cancelAllSubscriptions}
            </Button>
          )}
        </Div>
        <Div className="space-y-6">
          {/* Stats */}
          <Div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
      </Div>
    </Div>
  )
}

// ========================================
// Create Promo Dialog
// ========================================

function CreatePromoDialog({
  open,
  onOpenChange,
  appName,
  t,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  appName: string
  t: Required<PayAdminDashboardTexts>
  onCreated: () => void
}) {
  const { client } = usePayContext()

  const [code, setCode] = useState('')
  const [discountType, setDiscountType] = useState<PromoDiscountType>('percent')
  const [discountValue, setDiscountValue] = useState('')
  const [currency, setCurrency] = useState('EUR')
  const [duration, setDuration] = useState<PromoDuration>('once')
  const [durationInMonths, setDurationInMonths] = useState('')
  const [maxUses, setMaxUses] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset form on open + clear conditional fields on type/duration change
  useEffect(() => {
    if (open) {
      setCode('')
      setDiscountType('percent')
      setDiscountValue('')
      setCurrency('EUR')
      setDuration('once')
      setDurationInMonths('')
      setMaxUses('')
      setExpiresAt('')
      setError(null)
    }
  }, [open])

  // Clear currency when switching away from fixed
  useEffect(() => {
    if (discountType !== 'fixed') setCurrency('EUR')
  }, [discountType])

  // Clear durationInMonths when switching away from repeating
  useEffect(() => {
    if (duration !== 'repeating') setDurationInMonths('')
  }, [duration])

  const handleSubmit = useCallback(async () => {
    setSaving(true)
    setError(null)
    try {
      await client.createPromo({
        code: code.toUpperCase(),
        appName,
        discountType,
        discountValue: Number(discountValue),
        currency: discountType === 'fixed' ? currency : undefined,
        duration,
        durationInMonths: duration === 'repeating' ? Number(durationInMonths) : undefined,
        maxUses: maxUses ? Number(maxUses) : undefined,
        expiresAt: expiresAt || undefined,
        active: true,
      })
      toast.success(t.createPromoSuccess)
      onCreated()
      onOpenChange(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
      toast.error(t.createPromoError)
    } finally {
      setSaving(false)
    }
  }, [
    client,
    code,
    appName,
    discountType,
    discountValue,
    currency,
    duration,
    durationInMonths,
    maxUses,
    expiresAt,
    onCreated,
    onOpenChange,
  ])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.createPromoTitle}</DialogTitle>
          <DialogDescription>{t.createPromo}</DialogDescription>
        </DialogHeader>

        <Div className="space-y-4">
          {/* Required section */}
          <Div>
            <P className="text-xs text-muted-foreground font-medium mb-3">{t.promoRequired}</P>
            <Div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Code */}
              <Div className="space-y-2">
                <Label>{t.promoCode}</Label>
                <Input
                  value={code}
                  onChange={e => setCode(e.target.value.toUpperCase())}
                  placeholder="EARTHDAY2026"
                />
              </Div>

              {/* Discount Type */}
              <Div className="space-y-2">
                <Label>{t.promoDiscountType}</Label>
                <Select
                  value={discountType}
                  onValueChange={v => setDiscountType(v as PromoDiscountType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">{t.promoDiscountPercent}</SelectItem>
                    <SelectItem value="fixed">{t.promoDiscountFixed}</SelectItem>
                  </SelectContent>
                </Select>
                <P className="text-xs text-muted-foreground mt-1">
                  {discountType === 'percent'
                    ? t.promoDiscountTypeHintPercent
                    : t.promoDiscountTypeHintFixed}
                </P>
              </Div>

              {/* Discount Value */}
              <Div className="space-y-2">
                <Label>{t.promoDiscountValue}</Label>
                <Div className="relative">
                  <Input
                    type="number"
                    value={discountValue}
                    onChange={e => setDiscountValue(e.target.value)}
                    placeholder={discountType === 'percent' ? '20' : '5.00'}
                    className={discountType === 'percent' ? 'pr-8' : 'pr-12'}
                  />
                  <Span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
                    {discountType === 'percent' ? '%' : currency}
                  </Span>
                </Div>
                <P className="text-xs text-muted-foreground mt-1">
                  {discountType === 'percent'
                    ? t.promoDiscountValueHintPercent
                    : t.promoDiscountValueHintFixed}
                </P>
              </Div>

              {/* Duration */}
              <Div className="space-y-2">
                <Label>{t.promoDuration}</Label>
                <Select value={duration} onValueChange={v => setDuration(v as PromoDuration)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="once">{t.promoDurationOnce}</SelectItem>
                    <SelectItem value="repeating">{t.promoDurationRepeating}</SelectItem>
                    <SelectItem value="forever">{t.promoDurationForever}</SelectItem>
                  </SelectContent>
                </Select>
                <P className="text-xs text-muted-foreground mt-1">
                  {duration === 'once'
                    ? t.promoDurationHintOnce
                    : duration === 'repeating'
                      ? t.promoDurationHintRepeating
                      : t.promoDurationHintForever}
                </P>
              </Div>

              {/* Duration in months (only for repeating — becomes required) */}
              {duration === 'repeating' && (
                <Div className="space-y-2">
                  <Label>{t.promoDurationInMonths}</Label>
                  <Input
                    type="number"
                    value={durationInMonths}
                    onChange={e => setDurationInMonths(e.target.value)}
                    placeholder="3"
                    min={1}
                  />
                </Div>
              )}

              {/* Currency (only for fixed — becomes required) */}
              {discountType === 'fixed' && (
                <Div className="space-y-2">
                  <Label>{t.promoCurrency}</Label>
                  <Input
                    value={currency}
                    onChange={e => setCurrency(e.target.value.toUpperCase())}
                    placeholder="EUR"
                  />
                </Div>
              )}
            </Div>
          </Div>

          {/* Optional section */}
          <Div className="border-t border-border pt-4">
            <P className="text-xs text-muted-foreground font-medium mb-3">{t.promoOptionalSection}</P>
            <Div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Max uses */}
              <Div className="space-y-2">
                <Label>{t.promoMaxUses}</Label>
                <Input
                  type="number"
                  value={maxUses}
                  onChange={e => setMaxUses(e.target.value)}
                  placeholder={t.promoUnlimitedHint}
                  min={1}
                />
                <P className="text-xs text-muted-foreground mt-1">{t.promoMaxUsesHint}</P>
              </Div>

              {/* Expiry date */}
              <Div className="space-y-2">
                <Label>{t.promoExpiryDate}</Label>
                <Input
                  type="date"
                  value={expiresAt}
                  onChange={e => setExpiresAt(e.target.value)}
                />
              </Div>
            </Div>
          </Div>

          {/* Error — full width */}
          {error && (
            <Div>
              <P className="text-sm text-destructive">{error}</P>
            </Div>
          )}
        </Div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            {t.cancel}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saving || !code || !discountValue}
          >
            {saving && <Icon name="lucide:Loader2" className="w-4 h-4 animate-spin mr-2" />}
            {t.create}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ========================================
// Create Plan Dialog
// ========================================

function CreatePlanDialog({
  open,
  onOpenChange,
  appName,
  t,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  appName: string
  t: Required<PayAdminDashboardTexts>
  onCreated: () => void
}) {
  const { client } = usePayContext()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('EUR')
  const [interval, setInterval] = useState<'month' | 'year'>('month')
  const [intervalCount, setIntervalCount] = useState('1')
  const [features, setFeatures] = useState('')
  const [sortOrder, setSortOrder] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset form on open
  useEffect(() => {
    if (open) {
      setName('')
      setDescription('')
      setAmount('')
      setCurrency('EUR')
      setInterval('month')
      setIntervalCount('1')
      setFeatures('')
      setSortOrder('')
      setError(null)
    }
  }, [open])

  const handleSubmit = useCallback(async () => {
    setSaving(true)
    setError(null)
    try {
      const featuresArray = features
        .split(',')
        .map(f => f.trim())
        .filter(Boolean)

      await client.createPlan({
        name,
        appName,
        description: description || undefined,
        amount: Number(amount),
        currency,
        interval,
        intervalCount: Number(intervalCount),
        features: featuresArray.length > 0 ? featuresArray : undefined,
        sortOrder: sortOrder ? Number(sortOrder) : undefined,
      })
      toast.success(t.createPlanSuccess)
      onCreated()
      onOpenChange(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
      toast.error(t.createPlanError)
    } finally {
      setSaving(false)
    }
  }, [
    client,
    name,
    appName,
    description,
    amount,
    currency,
    interval,
    intervalCount,
    features,
    sortOrder,
    onCreated,
    onOpenChange,
    t,
  ])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.createPlanTitle}</DialogTitle>
          <DialogDescription>{t.createPlan}</DialogDescription>
        </DialogHeader>

        <Div className="space-y-4">
          {/* Required section */}
          <Div>
            <P className="text-xs text-muted-foreground font-medium mb-3">{t.promoRequired}</P>
            <Div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Name */}
              <Div className="space-y-2">
                <Label>{t.planName}</Label>
                <Input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Pro"
                />
              </Div>

              {/* Amount */}
              <Div className="space-y-2">
                <Label>{t.planAmount}</Label>
                <Input
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="999"
                  min={0}
                />
                <P className="text-xs text-muted-foreground mt-1">{t.planAmountHint}</P>
              </Div>

              {/* Currency */}
              <Div className="space-y-2">
                <Label>{t.planCurrency}</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                  </SelectContent>
                </Select>
              </Div>

              {/* Interval */}
              <Div className="space-y-2">
                <Label>{t.planInterval}</Label>
                <Select value={interval} onValueChange={v => setInterval(v as 'month' | 'year')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="month">{t.planIntervalMonth}</SelectItem>
                    <SelectItem value="year">{t.planIntervalYear}</SelectItem>
                  </SelectContent>
                </Select>
              </Div>

              {/* Interval Count */}
              <Div className="space-y-2">
                <Label>{t.planIntervalCount}</Label>
                <Input
                  type="number"
                  value={intervalCount}
                  onChange={e => setIntervalCount(e.target.value)}
                  placeholder="1"
                  min={1}
                  max={12}
                />
                <P className="text-xs text-muted-foreground mt-1">{t.planIntervalCountHint}</P>
              </Div>
            </Div>
          </Div>

          {/* Optional section */}
          <Div className="border-t border-border pt-4">
            <P className="text-xs text-muted-foreground font-medium mb-3">{t.promoOptionalSection}</P>
            <Div className="grid grid-cols-1 gap-4">
              {/* Description */}
              <Div className="space-y-2">
                <Label>{t.planDescription}</Label>
                <Input
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Access to all features"
                />
              </Div>

              <Div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Features */}
                <Div className="space-y-2">
                  <Label>{t.planFeatures}</Label>
                  <Input
                    value={features}
                    onChange={e => setFeatures(e.target.value)}
                    placeholder="Feature 1, Feature 2, Feature 3"
                  />
                  <P className="text-xs text-muted-foreground mt-1">{t.planFeaturesHint}</P>
                </Div>

                {/* Sort Order */}
                <Div className="space-y-2">
                  <Label>{t.planSortOrder}</Label>
                  <Input
                    type="number"
                    value={sortOrder}
                    onChange={e => setSortOrder(e.target.value)}
                    placeholder="0"
                    min={0}
                  />
                </Div>
              </Div>
            </Div>
          </Div>

          {/* Error — full width */}
          {error && (
            <Div>
              <P className="text-sm text-destructive">{error}</P>
            </Div>
          )}
        </Div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            {t.cancel}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saving || !name || !amount || !intervalCount}
          >
            {saving && <Icon name="lucide:Loader2" className="w-4 h-4 animate-spin mr-2" />}
            {t.create}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ========================================
// Plans Section (used in Subscriptions tab)
// ========================================

function PlansSection({
  appName,
  t,
}: {
  appName: string
  t: Required<PayAdminDashboardTexts>
}) {
  const { client } = usePayContext()

  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [statsLoading, setStatsLoading] = useState(true)

  // Stats
  const [totalPlansCount, setTotalPlansCount] = useState(0)
  const [activePlansCount, setActivePlansCount] = useState(0)

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false)

  // Delete dialog
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean
    planId: string | null
  }>({ open: false, planId: null })

  // Fetch plans
  const fetchPlans = useCallback(() => {
    setLoading(true)
    setStatsLoading(true)
    client
      .listPlans({ appName, limit: 100 })
      .then(result => {
        const list = result.data || []
        setPlans(list)
        setTotalPlansCount(result.meta?.total ?? list.length)
        setActivePlansCount(list.filter(p => p.active).length)
      })
      .catch(() => {})
      .finally(() => {
        setLoading(false)
        setStatsLoading(false)
      })
  }, [client, appName])

  useEffect(() => {
    fetchPlans()
  }, [fetchPlans])

  // Toggle active
  const handleToggleActive = useCallback(
    async (plan: Plan) => {
      try {
        await client.updatePlan(plan.id, { active: !plan.active })
        toast.success(t.togglePlanSuccess)
        fetchPlans()
      } catch {
        toast.error(t.togglePlanError)
      }
    },
    [client, fetchPlans, t]
  )

  // Delete handler
  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteDialog.planId) return
    await client.deletePlan(deleteDialog.planId)
    fetchPlans()
  }, [client, deleteDialog.planId, fetchPlans])

  // Format price — amount is stored in cents, convert to display unit
  const formatPrice = useCallback((plan: Plan) => {
    return formatCurrency(plan.amount / 100, plan.currency)
  }, [])

  // Format interval display
  const formatInterval = useCallback(
    (plan: Plan) => {
      const intervalLabel = plan.interval === 'month' ? t.planIntervalMonth : t.planIntervalYear
      if (plan.intervalCount > 1) {
        return `${plan.intervalCount}x ${intervalLabel}`
      }
      return intervalLabel
    },
    [t]
  )

  // Columns
  const columns: ColumnDef<Plan>[] = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: ({ header }) => <DataTableColumnHeader header={header} title={t.planNameHeader} />,
        cell: ({ row }) => (
          <Div>
            <Span className="font-medium">{row.original.name}</Span>
            {row.original.description && (
              <P className="text-xs text-muted-foreground">{row.original.description}</P>
            )}
          </Div>
        ),
      },
      {
        accessorKey: 'amount',
        header: ({ header }) => <DataTableColumnHeader header={header} title={t.planPriceHeader} />,
        cell: ({ row }) => <Span className="font-medium">{formatPrice(row.original)}</Span>,
      },
      {
        accessorKey: 'interval',
        header: ({ header }) => <DataTableColumnHeader header={header} title={t.planIntervalHeader} />,
        cell: ({ row }) => <Span className="text-sm">{formatInterval(row.original)}</Span>,
        enableSorting: false,
      },
      {
        accessorKey: 'features',
        header: ({ header }) => <DataTableColumnHeader header={header} title={t.planFeaturesHeader} />,
        cell: ({ row }) => (
          <Span className="text-sm">
            {row.original.features?.length || 0}
          </Span>
        ),
        enableSorting: false,
      },
      {
        accessorKey: 'active',
        header: ({ header }) => <DataTableColumnHeader header={header} title={t.statusHeader} />,
        cell: ({ row }) => (
          <Badge variant={row.original.active ? 'success' : 'secondary'} size="sm" dot>
            {row.original.active ? t.promoActive : t.promoInactive}
          </Badge>
        ),
      },
      {
        id: 'actions',
        header: t.actionsHeader,
        cell: ({ row }) => {
          const plan = row.original
          return (
            <Div className="flex items-center gap-2">
              <Switch
                checked={plan.active}
                onCheckedChange={() => handleToggleActive(plan)}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteDialog({ open: true, planId: plan.id })}
              >
                <Icon name="lucide:Trash2" size={14} />
              </Button>
            </Div>
          )
        },
      },
    ],
    [t, formatPrice, formatInterval, handleToggleActive]
  )

  return (
    <Div className="space-y-6">
      {/* Stats + Create button */}
      <Div className="flex flex-col sm:flex-row sm:items-end gap-4">
        <Div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
          <StatCard label={t.totalPlans} value={totalPlansCount} loading={statsLoading} />
          <StatCard label={t.activePlans} value={activePlansCount} loading={statsLoading} />
        </Div>
        <Button onClick={() => setCreateOpen(true)}>
          <Icon name="lucide:Plus" size={16} className="mr-2" />
          {t.createPlan}
        </Button>
      </Div>

      {/* Table */}
      {loading ? (
        <Card className="p-8">
          <Div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </Div>
        </Card>
      ) : plans.length === 0 ? (
        <EmptyState message={t.noPlans} />
      ) : (
        <DataTable columns={columns} data={plans} pageSize={PAGE_SIZE} />
      )}

      {/* Create Plan Dialog */}
      <CreatePlanDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        appName={appName}
        t={t}
        onCreated={fetchPlans}
      />

      {/* Delete Dialog */}
      <ConfirmActionDialog
        open={deleteDialog.open}
        onOpenChange={open => setDeleteDialog(prev => ({ ...prev, open }))}
        title={t.deletePlanTitle}
        description={t.deletePlanDescription}
        onConfirm={handleDeleteConfirm}
        variant="destructive"
        texts={{
          confirmLabel: t.confirm,
          cancelLabel: t.cancel,
          loadingMessage: t.loading,
          successMessage: t.deletePlanSuccess,
          errorMessage: t.deletePlanError,
          retryLabel: t.retry,
          closeLabel: t.close,
        }}
      />
    </Div>
  )
}

// ========================================
// Promos Tab
// ========================================

function PromosTab({
  appName,
  t,
}: {
  appName: string
  t: Required<PayAdminDashboardTexts>
}) {
  const { client } = usePayContext()

  const [promos, setPromos] = useState<Promo[]>([])
  const [loading, setLoading] = useState(true)
  const [statsLoading, setStatsLoading] = useState(true)

  // Stats
  const [totalPromos, setTotalPromos] = useState(0)
  const [activePromosCount, setActivePromosCount] = useState(0)
  const [totalUsesCount, setTotalUsesCount] = useState(0)

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false)

  // Delete dialog
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean
    promoId: string | null
  }>({ open: false, promoId: null })

  // Fetch promos
  const fetchPromos = useCallback(() => {
    setLoading(true)
    setStatsLoading(true)
    client
      .listPromos({ appName, limit: 100 })
      .then(result => {
        const list = result.data || []
        setPromos(list)
        setTotalPromos(result.meta?.total ?? list.length)
        setActivePromosCount(list.filter(p => p.active).length)
        setTotalUsesCount(list.reduce((sum, p) => sum + p.usedCount, 0))
      })
      .catch(() => {})
      .finally(() => {
        setLoading(false)
        setStatsLoading(false)
      })
  }, [client, appName])

  useEffect(() => {
    fetchPromos()
  }, [fetchPromos])

  // Toggle active
  const handleToggleActive = useCallback(
    async (promo: Promo) => {
      try {
        await client.updatePromo(promo.id, { active: !promo.active })
        toast.success(t.togglePromoSuccess)
        fetchPromos()
      } catch {
        toast.error(t.togglePromoError)
      }
    },
    [client, fetchPromos, t]
  )

  // Delete handler
  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteDialog.promoId) return
    await client.deletePromo(deleteDialog.promoId)
    fetchPromos()
  }, [client, deleteDialog.promoId, fetchPromos])

  // Format discount display
  const formatDiscount = useCallback((promo: Promo) => {
    if (promo.discountType === 'percent') {
      return `${promo.discountValue}%`
    }
    return formatCurrency(promo.discountValue, promo.currency || 'EUR')
  }, [])

  // Duration label
  const getDurationLabel = useCallback(
    (promo: Promo) => {
      if (promo.duration === 'once') return t.promoDurationOnce
      if (promo.duration === 'forever') return t.promoDurationForever
      if (promo.duration === 'repeating' && promo.durationInMonths) {
        return `${t.promoDurationRepeating} (${promo.durationInMonths}m)`
      }
      return promo.duration
    },
    [t]
  )

  // Columns
  const columns: ColumnDef<Promo>[] = useMemo(
    () => [
      {
        accessorKey: 'code',
        header: ({ header }) => <DataTableColumnHeader header={header} title={t.codeHeader} />,
        cell: ({ row }) => (
          <Span className="font-mono font-medium">{row.original.code}</Span>
        ),
      },
      {
        accessorKey: 'discountValue',
        header: ({ header }) => <DataTableColumnHeader header={header} title={t.discountHeader} />,
        cell: ({ row }) => <Span className="font-medium">{formatDiscount(row.original)}</Span>,
      },
      {
        accessorKey: 'duration',
        header: ({ header }) => <DataTableColumnHeader header={header} title={t.durationHeader} />,
        cell: ({ row }) => <Span className="text-sm">{getDurationLabel(row.original)}</Span>,
        enableSorting: false,
      },
      {
        accessorKey: 'usedCount',
        header: ({ header }) => <DataTableColumnHeader header={header} title={t.usesHeader} />,
        cell: ({ row }) => (
          <Span className="text-sm">
            {row.original.usedCount}
            {row.original.maxUses ? `/${row.original.maxUses}` : ''}
          </Span>
        ),
      },
      {
        accessorKey: 'active',
        header: ({ header }) => <DataTableColumnHeader header={header} title={t.statusHeader} />,
        cell: ({ row }) => (
          <Badge variant={row.original.active ? 'success' : 'secondary'} size="sm" dot>
            {row.original.active ? t.promoActive : t.promoInactive}
          </Badge>
        ),
      },
      {
        accessorKey: 'expiresAt',
        header: ({ header }) => <DataTableColumnHeader header={header} title={t.expiryHeader} />,
        cell: ({ row }) => (
          <Span className="text-sm">
            {row.original.expiresAt ? formatDateShort(row.original.expiresAt) : t.promoNoExpiry}
          </Span>
        ),
      },
      {
        id: 'actions',
        header: t.actionsHeader,
        cell: ({ row }) => {
          const promo = row.original
          return (
            <Div className="flex items-center gap-2">
              <Switch
                checked={promo.active}
                onCheckedChange={() => handleToggleActive(promo)}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteDialog({ open: true, promoId: promo.id })}
              >
                <Icon name="lucide:Trash2" size={14} />
              </Button>
            </Div>
          )
        },
      },
    ],
    [t, formatDiscount, getDurationLabel, handleToggleActive]
  )

  return (
    <Div className="space-y-6">
      {/* Stats + Create button */}
      <Div className="flex flex-col sm:flex-row sm:items-end gap-4">
        <Div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-1">
          <StatCard label={t.totalPromos} value={totalPromos} loading={statsLoading} />
          <StatCard label={t.activePromos} value={activePromosCount} loading={statsLoading} />
          <StatCard label={t.totalUses} value={totalUsesCount} loading={statsLoading} />
        </Div>
        <Button onClick={() => setCreateOpen(true)}>
          <Icon name="lucide:Plus" size={16} className="mr-2" />
          {t.createPromo}
        </Button>
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
      ) : promos.length === 0 ? (
        <EmptyState message={t.noPromos} />
      ) : (
        <DataTable columns={columns} data={promos} pageSize={PAGE_SIZE} />
      )}

      {/* Create Promo Dialog */}
      <CreatePromoDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        appName={appName}
        t={t}
        onCreated={fetchPromos}
      />

      {/* Delete Dialog */}
      <ConfirmActionDialog
        open={deleteDialog.open}
        onOpenChange={open => setDeleteDialog(prev => ({ ...prev, open }))}
        title={t.deletePromoTitle}
        description={t.deletePromoDescription}
        onConfirm={handleDeleteConfirm}
        variant="destructive"
        texts={{
          confirmLabel: t.confirm,
          cancelLabel: t.cancel,
          loadingMessage: t.loading,
          successMessage: t.deletePromoSuccess,
          errorMessage: t.deletePromoError,
          retryLabel: t.retry,
          closeLabel: t.close,
        }}
      />
    </Div>
  )
}

// ========================================
// Main Component
// ========================================

const DEFAULT_TEXTS: Required<PayAdminDashboardTexts> = {
  // Tabs
  paymentsTab: 'Payments',
  subscriptionsTab: 'Subscriptions',
  promosTab: 'Promos',

  // Stats
  totalRevenue: 'Total Revenue',
  totalPayments: 'Total Payments',
  completedPayments: 'Completed',
  failedPayments: 'Failed',
  activeSubscriptions: 'Active Subscriptions',
  mrr: 'Monthly Recurring Revenue',
  totalPromos: 'Total Promos',
  activePromos: 'Active Promos',
  totalUses: 'Total Uses',

  // Payment table headers
  dateHeader: 'Date',
  userHeader: 'User',
  typeHeader: 'Type',
  amountHeader: 'Amount',
  statusHeader: 'Status',
  actionsHeader: 'Actions',

  // Subscription table headers
  planHeader: 'Plan',
  intervalHeader: 'Interval',
  startedHeader: 'Started',

  // Promo table headers
  codeHeader: 'Code',
  discountHeader: 'Discount',
  durationHeader: 'Duration',
  usesHeader: 'Uses',
  expiryHeader: 'Expiry',

  // Filters
  allTypes: 'All types',
  allStatuses: 'All statuses',
  searchPlaceholder: 'Search by email...',

  // Payment types
  donation: 'Donation',
  purchase: 'Purchase',
  subscription: 'Subscription',
  invoice: 'Invoice',

  // Payment statuses
  completed: 'Completed',
  pending: 'Pending',
  failed: 'Failed',
  refunded: 'Refunded',
  cancelled: 'Cancelled',

  // Subscription intervals
  monthly: 'Monthly',

  // Actions
  refund: 'Refund',
  refundTitle: 'Refund Payment',
  refundDescription: 'Are you sure you want to refund this payment? This action cannot be undone.',
  refundSuccess: 'Payment refunded successfully',
  refundError: 'Failed to refund payment',
  cancelSubscription: 'Cancel',
  cancelSubscriptionTitle: 'Cancel Subscription',
  cancelSubscriptionDescription:
    'Are you sure you want to cancel this subscription? The customer will lose access at the end of the current billing period.',
  cancelSubscriptionSuccess: 'Subscription cancelled successfully',
  cancelSubscriptionError: 'Failed to cancel subscription',

  // Promo actions
  createPromo: 'Create Promo',
  createPromoTitle: 'Create Promo Code',
  deletePromo: 'Delete',
  deletePromoTitle: 'Delete Promo',
  deletePromoDescription: 'Are you sure you want to delete this promo code? This action cannot be undone.',
  createPromoSuccess: 'Promo code created successfully',
  createPromoError: 'Failed to create promo code',
  deletePromoSuccess: 'Promo deleted successfully',
  deletePromoError: 'Failed to delete promo',
  togglePromoSuccess: 'Promo status updated',
  togglePromoError: 'Failed to update promo',

  // Promo form labels
  promoCode: 'Code',
  promoAppName: 'App Name',
  promoDiscountType: 'Discount Type',
  promoDiscountValue: 'Discount Value',
  promoCurrency: 'Currency',
  promoDuration: 'Duration',
  promoDurationInMonths: 'Duration (months)',
  promoMaxUses: 'Max Uses',
  promoExpiryDate: 'Expiry Date',
  promoDiscountPercent: 'Percentage',
  promoDiscountFixed: 'Fixed Amount',
  promoDurationOnce: 'Once',
  promoDurationRepeating: 'Repeating',
  promoDurationForever: 'Forever',
  promoActive: 'Active',
  promoInactive: 'Inactive',
  promoNoExpiry: 'No expiry',
  promoOptional: 'optional',
  promoUnlimitedHint: 'Unlimited if empty',
  promoRequired: 'Required',
  promoOptionalSection: 'Optional',

  // Promo form hints
  promoDiscountTypeHintPercent: 'Percentage off the price (e.g., 20 = 20% off)',
  promoDiscountTypeHintFixed: 'Fixed amount off (e.g., 5 = 5€ off)',
  promoDurationHintOnce:
    'Discount applies to the first payment only. Use for one-time offers to specific customers.',
  promoDurationHintRepeating:
    'Discount applies for a set number of months, then full price resumes. Ideal for "X months free" promos.',
  promoDurationHintForever:
    'Discount applies permanently as long as the subscription is active. Use for loyalty or partnership deals.',
  promoDiscountValueHintPercent: 'Enter percentage (e.g., 100 for 100% = free, 20 for 20% off)',
  promoDiscountValueHintFixed: 'Enter amount in smallest unit (e.g., 500 = 5.00)',
  promoMaxUsesHint: 'Maximum number of customers who can use this code. Leave empty for unlimited.',

  // Plan stats
  totalPlans: 'Total Plans',
  activePlans: 'Active Plans',

  // Plan table headers
  planNameHeader: 'Name',
  planPriceHeader: 'Price',
  planIntervalHeader: 'Interval',
  planFeaturesHeader: 'Features',

  // Plan actions
  createPlan: 'Create Plan',
  createPlanTitle: 'Create Subscription Plan',
  deletePlan: 'Delete',
  deletePlanTitle: 'Delete Plan',
  deletePlanDescription: 'Are you sure you want to delete this plan? Existing subscribers will not be affected, but no new subscriptions can be created with this plan.',
  createPlanSuccess: 'Plan created successfully',
  createPlanError: 'Failed to create plan',
  deletePlanSuccess: 'Plan deleted successfully',
  deletePlanError: 'Failed to delete plan',
  togglePlanSuccess: 'Plan status updated',
  togglePlanError: 'Failed to update plan',
  updatePlanSuccess: 'Plan updated successfully',
  updatePlanError: 'Failed to update plan',

  // Plan form labels
  planName: 'Name',
  planDescription: 'Description',
  planAmount: 'Amount',
  planCurrency: 'Currency',
  planInterval: 'Interval',
  planIntervalCount: 'Interval Count',
  planFeatures: 'Features',
  planSortOrder: 'Sort Order',
  planIntervalMonth: 'Monthly',
  planIntervalYear: 'Yearly',

  // Plan form hints
  planAmountHint: 'Price in cents (e.g., 999 = 9.99, 2999 = 29.99)',
  planIntervalCountHint: '1 = monthly, 3 = quarterly, 6 = semi-annual, 12 = annual',
  planFeaturesHint: 'Comma-separated list of features included in this plan',

  // Plan section labels
  plansSection: 'Plans',
  activeSubscriptionsSection: 'Active Subscriptions',

  // Plan empty
  noPlans: 'No plans yet.',

  // Dialog common
  confirm: 'Confirm',
  cancel: 'Cancel',
  loading: 'Processing...',
  close: 'Close',
  retry: 'Retry',
  save: 'Save',
  create: 'Create',

  // App filter
  allApps: 'All apps',
  appFilterLabel: 'App',

  // Empty states
  noPayments: 'No payments found.',
  noSubscriptions: 'No subscriptions found.',
  noPromos: 'No promo codes yet.',

  // Test mode bulk actions
  testModeWarning: 'Test Mode — Bulk actions available',
  refundAllCompleted: 'Refund All Completed',
  refundAllConfirm: 'Refund ALL completed payments? This cannot be undone.',
  refundAllSuccess: 'Bulk refund completed',
  cancelAllSubscriptions: 'Cancel All Active',
  cancelAllConfirm: 'Cancel ALL active subscriptions? This cannot be undone.',
  cancelAllSuccess: 'Bulk cancel completed',
}

export function PayAdminDashboard({ appName, showAppFilter, testMode, className, texts }: PayAdminDashboardProps) {
  const { client } = usePayContext()
  const t: Required<PayAdminDashboardTexts> = useMemo(
    () => ({ ...DEFAULT_TEXTS, ...texts }),
    [texts]
  )

  // App filter state — only used when showAppFilter is true
  const [appFilter, setAppFilter] = useState<string>('all')
  const [appOptions, setAppOptions] = useState<string[]>([])

  // Fetch unique app names from payments for the filter dropdown
  useEffect(() => {
    if (!showAppFilter) return
    client
      .getPayments({ limit: 100 })
      .then(result => {
        const apps = new Set<string>()
        for (const p of result.payments) {
          if (p.projectId) apps.add(p.projectId)
        }
        setAppOptions(Array.from(apps).sort())
      })
      .catch(() => {})
  }, [client, showAppFilter])

  // Effective appName: when filter is active and a specific app is selected, use it
  const effectiveAppName = showAppFilter && appFilter !== 'all' ? appFilter : appName

  return (
    <Div className={className}>
      {/* App filter for superadmin */}
      {showAppFilter && appOptions.length > 0 && (
        <Div className="mb-4">
          <Select value={appFilter} onValueChange={setAppFilter}>
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue placeholder={t.allApps} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.allApps}</SelectItem>
              {appOptions.map(app => (
                <SelectItem key={app} value={app}>
                  {app}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Div>
      )}

      {testMode && (
        <Div className="bg-warning/10 border border-warning/30 rounded-lg p-3 mb-4 flex items-center gap-2">
          <Icon name="lucide:AlertTriangle" className="w-4 h-4 text-warning shrink-0" />
          <Span className="text-sm font-medium text-warning">{t.testModeWarning}</Span>
        </Div>
      )}

      <Tabs defaultValue="payments">
        <TabsList>
          <TabsTrigger value="payments">{t.paymentsTab}</TabsTrigger>
          <TabsTrigger value="subscriptions">{t.subscriptionsTab}</TabsTrigger>
          <TabsTrigger value="promos">{t.promosTab}</TabsTrigger>
        </TabsList>

        <TabsContent value="payments">
          <PaymentsTab appName={effectiveAppName} t={t} testMode={testMode} />
        </TabsContent>

        <TabsContent value="subscriptions">
          <SubscriptionsTab appName={effectiveAppName} t={t} testMode={testMode} />
        </TabsContent>

        <TabsContent value="promos">
          <PromosTab appName={effectiveAppName} t={t} />
        </TabsContent>
      </Tabs>
    </Div>
  )
}
