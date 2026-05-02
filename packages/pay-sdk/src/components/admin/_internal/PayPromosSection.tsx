'use client'

/**
 * Promos tab content for `<PayAdminDashboard>` — split out from the legacy
 * combined Promos+Plans tab.
 *
 * Auto-scoped server-side via JWT. The `appSlug` comes from the surrounding
 * `<PayProvider>`. When null, the API falls back to the caller's derived scope.
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
  Icon,
  Input,
  Label,
  Modal,
  P,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Span,
  Switch,
  type ColumnDef,
} from '@ezstart/ui/components'
import { toast } from '@ezstart/ui/utils'
import type { Promo, PromoDiscountType, PromoDuration } from '../../../core/types.js'
import { formatCurrency } from '../../../core/format-currency.js'
import { usePayContext } from '../../../react/pay-provider.js'
import type { PayPromosSectionTexts } from './types.js'
import { PAGE_SIZE, formatDateShort } from './helpers.js'
import { EmptyState, StatCard } from './primitives.js'

export const DEFAULT_PROMOS_TEXTS: Required<PayPromosSectionTexts> = {
  totalPromos: 'Total Promos',
  activePromos: 'Active Promos',
  totalUses: 'Total Uses',
  codeHeader: 'Code',
  discountHeader: 'Discount',
  durationHeader: 'Duration',
  usesHeader: 'Uses',
  expiryHeader: 'Expiry',
  statusHeader: 'Status',
  actionsHeader: 'Actions',
  active: 'Active',
  inactive: 'Inactive',
  noExpiry: 'No expiry',
  createPromo: 'Create Promo',
  createPromoTitle: 'Create Promo Code',
  deletePromo: 'Delete',
  deletePromoTitle: 'Delete Promo',
  deletePromoDescription:
    'Are you sure you want to delete this promo code? This action cannot be undone.',
  createPromoSuccess: 'Promo code created successfully',
  createPromoError: 'Failed to create promo code',
  deletePromoSuccess: 'Promo deleted successfully',
  deletePromoError: 'Failed to delete promo',
  togglePromoSuccess: 'Promo status updated',
  togglePromoError: 'Failed to update promo',
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
  unlimitedHint: 'Unlimited if empty',
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
  required: 'Required',
  optionalSection: 'Optional',
  noPromos: 'No promo codes yet.',
  confirm: 'Confirm',
  cancel: 'Cancel',
  loading: 'Processing...',
  close: 'Close',
  retry: 'Retry',
  create: 'Create',
}

interface PayPromosSectionProps {
  texts: Required<PayPromosSectionTexts>
}

export function PayPromosSection({ texts: t }: PayPromosSectionProps) {
  const { client, appSlug } = usePayContext()

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

  // Fetch promos — appSlug comes from PayProvider context (resolved from
  // publishable key). Server further filters by RBAC scope.
  const fetchPromos = useCallback(() => {
    setLoading(true)
    setStatsLoading(true)
    client
      .listPromos({ appName: appSlug || undefined, limit: 100 })
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
  }, [client, appSlug])

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
        cell: ({ row }) => <Span className="font-mono font-medium">{row.original.code}</Span>,
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
            {row.original.active ? t.active : t.inactive}
          </Badge>
        ),
      },
      {
        accessorKey: 'expiresAt',
        header: ({ header }) => <DataTableColumnHeader header={header} title={t.expiryHeader} />,
        cell: ({ row }) => (
          <Span className="text-sm">
            {row.original.expiresAt ? formatDateShort(row.original.expiresAt) : t.noExpiry}
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
              <Switch checked={promo.active} onCheckedChange={() => handleToggleActive(promo)} />
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
        appSlug={appSlug}
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

// ---------------------------------------------------------------------------
// CreatePromoDialog
// ---------------------------------------------------------------------------

function CreatePromoDialog({
  open,
  onOpenChange,
  appSlug,
  t,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  appSlug: string | null
  t: Required<PayPromosSectionTexts>
  onCreated: () => void
}) {
  const { client } = usePayContext()

  const [code, setCode] = useState('')
  const [promoAppName, setPromoAppName] = useState(appSlug || '')
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
      setPromoAppName(appSlug || '')
      setDiscountType('percent')
      setDiscountValue('')
      setCurrency('EUR')
      setDuration('once')
      setDurationInMonths('')
      setMaxUses('')
      setExpiresAt('')
      setError(null)
    }
  }, [open, appSlug])

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
        appName: promoAppName,
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
    promoAppName,
    discountType,
    discountValue,
    currency,
    duration,
    durationInMonths,
    maxUses,
    expiresAt,
    onCreated,
    onOpenChange,
    t,
  ])

  return (
    <Modal
      isOpen={open}
      onClose={() => onOpenChange(false)}
      title={t.createPromoTitle}
      description={t.createPromo}
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            {t.cancel}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saving || !code || !discountValue || !promoAppName}
          >
            {saving && <Icon name="lucide:Loader2" className="w-4 h-4 animate-spin mr-2" />}
            {t.create}
          </Button>
        </>
      }
    >
      <Div className="space-y-4">
        {/* Required section */}
        <Div>
          <P className="text-xs text-muted-foreground font-medium mb-3">{t.required}</P>
          <Div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Div className="space-y-2">
              <Label>{t.promoCode}</Label>
              <Input
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                placeholder="EARTHDAY2026"
              />
            </Div>

            {/* App Name — only shown when no appSlug provided (superadmin) */}
            {!appSlug && (
              <Div className="space-y-2">
                <Label>{t.promoAppName}</Label>
                <Input
                  value={promoAppName}
                  onChange={e => setPromoAppName(e.target.value)}
                  placeholder="green-pulse"
                />
              </Div>
            )}

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

            {/* Duration in months (only for repeating — required) */}
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

            {/* Currency (only for fixed — required) */}
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
          <P className="text-xs text-muted-foreground font-medium mb-3">{t.optionalSection}</P>
          <Div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Div className="space-y-2">
              <Label>{t.promoMaxUses}</Label>
              <Input
                type="number"
                value={maxUses}
                onChange={e => setMaxUses(e.target.value)}
                placeholder={t.unlimitedHint}
                min={1}
              />
              <P className="text-xs text-muted-foreground mt-1">{t.promoMaxUsesHint}</P>
            </Div>

            <Div className="space-y-2">
              <Label>{t.promoExpiryDate}</Label>
              <Input type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} />
            </Div>
          </Div>
        </Div>

        {error && (
          <Div>
            <P className="text-sm text-destructive">{error}</P>
          </Div>
        )}
      </Div>
    </Modal>
  )
}
