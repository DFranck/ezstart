'use client'

/**
 * Plans tab content for `<PayAdminDashboard>` — split out from the legacy
 * combined Promos+Plans tab.
 *
 * Auto-scoped server-side via JWT. The `appSlug` comes from the surrounding
 * `<PayProvider>` (resolved from the publishable key) — when null, the API
 * falls back to the caller's derived scope.
 *
 * @internal
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Badge,
  Button,
  Card,
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
import type { Plan } from '../../../core/types.js'
import { formatCurrency } from '../../../core/format-currency.js'
import { usePayContext } from '../../../react/pay-provider.js'
import { ConfirmActionDialog } from '../../ConfirmActionDialog.js'
import type { PayPlansSectionTexts } from './types.js'
import { PAGE_SIZE } from './helpers.js'
import { EmptyState, StatCard } from './primitives.js'

export const DEFAULT_PLANS_TEXTS: Required<PayPlansSectionTexts> = {
  totalPlans: 'Total Plans',
  activePlans: 'Active Plans',
  planNameHeader: 'Name',
  planPriceHeader: 'Price',
  planIntervalHeader: 'Interval',
  planFeaturesHeader: 'Features',
  planTrialDays: 'Trial Days',
  statusHeader: 'Status',
  actionsHeader: 'Actions',
  active: 'Active',
  inactive: 'Inactive',
  createPlan: 'Create Plan',
  createPlanTitle: 'Create Subscription Plan',
  deletePlan: 'Delete',
  deletePlanTitle: 'Delete Plan',
  deletePlanDescription:
    'Are you sure you want to delete this plan? Existing subscribers will not be affected, but no new subscriptions can be created with this plan.',
  createPlanSuccess: 'Plan created successfully',
  createPlanError: 'Failed to create plan',
  deletePlanSuccess: 'Plan deleted successfully',
  deletePlanError: 'Failed to delete plan',
  togglePlanSuccess: 'Plan status updated',
  togglePlanError: 'Failed to update plan',
  planName: 'Name',
  planAppName: 'App Name',
  planDescription: 'Description',
  planAmount: 'Amount',
  planCurrency: 'Currency',
  planInterval: 'Interval',
  planIntervalCount: 'Interval Count',
  planFeatures: 'Features',
  planSortOrder: 'Sort Order',
  planIntervalMonth: 'Monthly',
  planIntervalYear: 'Yearly',
  planAmountHint: 'Price in cents (e.g., 999 = 9.99, 2999 = 29.99)',
  planIntervalCountHint: '1 = monthly, 3 = quarterly, 6 = semi-annual, 12 = annual',
  planFeaturesHint: 'Comma-separated list of features included in this plan',
  planTrialDaysHint: 'Number of free trial days before first charge (0 = no trial)',
  required: 'Required',
  optionalSection: 'Optional',
  noPlans: 'No plans yet.',
  confirm: 'Confirm',
  cancel: 'Cancel',
  loading: 'Processing...',
  close: 'Close',
  retry: 'Retry',
  create: 'Create',
}

interface PayPlansSectionProps {
  texts: Required<PayPlansSectionTexts>
}

export function PayPlansSection({ texts: t }: PayPlansSectionProps) {
  const { client, appSlug } = usePayContext()

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

  // Fetch plans — appSlug comes from PayProvider context (resolved from
  // publishable key). Server further filters by RBAC scope.
  const fetchPlans = useCallback(() => {
    setLoading(true)
    setStatsLoading(true)
    client
      .listPlans({ appName: appSlug || undefined, limit: 100 })
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
  }, [client, appSlug])

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
        header: ({ header }) => (
          <DataTableColumnHeader header={header} title={t.planIntervalHeader} />
        ),
        cell: ({ row }) => <Span className="text-sm">{formatInterval(row.original)}</Span>,
        enableSorting: false,
      },
      {
        accessorKey: 'features',
        header: ({ header }) => (
          <DataTableColumnHeader header={header} title={t.planFeaturesHeader} />
        ),
        cell: ({ row }) => <Span className="text-sm">{row.original.features?.length || 0}</Span>,
        enableSorting: false,
      },
      {
        accessorKey: 'trialDays',
        header: ({ header }) => <DataTableColumnHeader header={header} title={t.planTrialDays} />,
        cell: ({ row }) => (
          <Span className="text-sm">
            {row.original.trialDays ? `${row.original.trialDays}d` : '—'}
          </Span>
        ),
        enableSorting: false,
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
        id: 'actions',
        header: t.actionsHeader,
        cell: ({ row }) => {
          const plan = row.original
          return (
            <Div className="flex items-center gap-2">
              <Switch checked={plan.active} onCheckedChange={() => handleToggleActive(plan)} />
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
        appSlug={appSlug}
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

// ---------------------------------------------------------------------------
// CreatePlanDialog
// ---------------------------------------------------------------------------

function CreatePlanDialog({
  open,
  onOpenChange,
  appSlug,
  t,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  appSlug: string | null
  t: Required<PayPlansSectionTexts>
  onCreated: () => void
}) {
  const { client } = usePayContext()

  const [name, setName] = useState('')
  const [planAppName, setPlanAppName] = useState(appSlug || '')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('EUR')
  const [interval, setInterval] = useState<'month' | 'year'>('month')
  const [intervalCount, setIntervalCount] = useState('1')
  const [features, setFeatures] = useState('')
  const [trialDays, setTrialDays] = useState('')
  const [sortOrder, setSortOrder] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset form on open
  useEffect(() => {
    if (open) {
      setName('')
      setPlanAppName(appSlug || '')
      setDescription('')
      setAmount('')
      setCurrency('EUR')
      setInterval('month')
      setIntervalCount('1')
      setFeatures('')
      setTrialDays('')
      setSortOrder('')
      setError(null)
    }
  }, [open, appSlug])

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
        appName: planAppName,
        description: description || undefined,
        amount: Number(amount),
        currency,
        interval,
        intervalCount: Number(intervalCount),
        features: featuresArray.length > 0 ? featuresArray : undefined,
        trialDays: trialDays ? Number(trialDays) : undefined,
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
    planAppName,
    description,
    amount,
    currency,
    interval,
    intervalCount,
    features,
    trialDays,
    sortOrder,
    onCreated,
    onOpenChange,
    t,
  ])

  return (
    <Modal
      isOpen={open}
      onClose={() => onOpenChange(false)}
      title={t.createPlanTitle}
      description={t.createPlan}
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            {t.cancel}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saving || !name || !amount || !intervalCount || !planAppName}
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
              <Label>{t.planName}</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Pro" />
            </Div>

            {/* App Name — only shown when no appSlug is provided (superadmin) */}
            {!appSlug && (
              <Div className="space-y-2">
                <Label>{t.planAppName}</Label>
                <Input
                  value={planAppName}
                  onChange={e => setPlanAppName(e.target.value)}
                  placeholder="green-pulse"
                />
              </Div>
            )}

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
          <P className="text-xs text-muted-foreground font-medium mb-3">{t.optionalSection}</P>
          <Div className="grid grid-cols-1 gap-4">
            <Div className="space-y-2">
              <Label>{t.planDescription}</Label>
              <Input
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Access to all features"
              />
            </Div>

            <Div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Div className="space-y-2">
                <Label>{t.planFeatures}</Label>
                <Input
                  value={features}
                  onChange={e => setFeatures(e.target.value)}
                  placeholder="Feature 1, Feature 2, Feature 3"
                />
                <P className="text-xs text-muted-foreground mt-1">{t.planFeaturesHint}</P>
              </Div>

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

              <Div className="space-y-2">
                <Label>{t.planTrialDays}</Label>
                <Input
                  type="number"
                  value={trialDays}
                  onChange={e => setTrialDays(e.target.value)}
                  placeholder="0"
                  min={0}
                  max={90}
                />
                <P className="text-xs text-muted-foreground mt-1">{t.planTrialDaysHint}</P>
              </Div>
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
