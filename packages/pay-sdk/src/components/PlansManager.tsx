'use client'

/**
 * Drop-in dashboard for managing EZPay subscription plans for a single
 * ezauth Application.
 *
 * Surfaces CRUD on plans via {@link PayClient.listPlans}, {@link
 * PayClient.createPlan}, {@link PayClient.updatePlan} and
 * {@link PayClient.deletePlan}. The Stripe product/price is synced on the
 * backend when a plan is created or updated — there is no direct Stripe
 * integration on the client.
 *
 * Peer dependencies: `@ezstart/ui` + an enclosing `<PayProvider>`.
 */

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  type ColumnDef,
  DataTable,
  Div,
  P,
  Span,
  Spinner,
} from '@ezstart/ui/components'
import { toast } from '@ezstart/ui/utils'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Plan } from '../core/types.js'
import { formatCurrency } from '../core/format-currency.js'
import { usePayContext, usePayLocale } from '../react/pay-provider.js'
import {
  PlanEditorDialog,
  type PlanEditorDialogTexts,
  defaultPlanEditorDialogTexts,
} from './PlanEditorDialog.js'

export interface PlansManagerTexts {
  title: string
  subtitle: string
  createButton: string
  empty: string
  loading: string
  fetchFailed: string
  retry: string
  columns: {
    name: string
    price: string
    interval: string
    status: string
    features: string
    actions: string
  }
  status: {
    active: string
    inactive: string
  }
  intervals: {
    month: string
    year: string
  }
  actions: {
    edit: string
    archive: string
    archiveConfirm: string
    archiveCancel: string
    archiveConfirmDescription: string
  }
  toast: {
    created: string
    updated: string
    archived: string
    error: string
  }
  editor: PlanEditorDialogTexts
}

export const defaultPlansManagerTexts: PlansManagerTexts = {
  title: 'Plans',
  subtitle: 'Manage subscription plans for this application',
  createButton: 'Create Plan',
  empty: 'No plans yet. Create your first plan.',
  loading: 'Loading plans...',
  fetchFailed: 'Failed to load plans',
  retry: 'Retry',
  columns: {
    name: 'Name',
    price: 'Price',
    interval: 'Interval',
    status: 'Status',
    features: 'Features',
    actions: 'Actions',
  },
  status: {
    active: 'Active',
    inactive: 'Inactive',
  },
  intervals: {
    month: 'Monthly',
    year: 'Yearly',
  },
  actions: {
    edit: 'Edit',
    archive: 'Archive',
    archiveConfirm: 'Archive plan',
    archiveCancel: 'Cancel',
    archiveConfirmDescription:
      'This plan will no longer be available for new subscriptions. Existing subscriptions continue on the archived price.',
  },
  toast: {
    created: 'Plan created',
    updated: 'Plan updated',
    archived: 'Plan archived',
    error: 'An error occurred',
  },
  editor: defaultPlanEditorDialogTexts,
}

function mergeTexts(partial?: Partial<PlansManagerTexts>): PlansManagerTexts {
  if (!partial) return defaultPlansManagerTexts
  return {
    ...defaultPlansManagerTexts,
    ...partial,
    columns: { ...defaultPlansManagerTexts.columns, ...partial.columns },
    status: { ...defaultPlansManagerTexts.status, ...partial.status },
    intervals: { ...defaultPlansManagerTexts.intervals, ...partial.intervals },
    actions: { ...defaultPlansManagerTexts.actions, ...partial.actions },
    toast: { ...defaultPlansManagerTexts.toast, ...partial.toast },
    editor: {
      ...defaultPlansManagerTexts.editor,
      ...partial.editor,
      validation: {
        ...defaultPlansManagerTexts.editor.validation,
        ...partial.editor?.validation,
      },
      toast: {
        ...defaultPlansManagerTexts.editor.toast,
        ...partial.editor?.toast,
      },
    },
  }
}

export interface PlansManagerProps {
  applicationId: string
  texts?: Partial<PlansManagerTexts>
  /**
   * BCP-47 locale passed to `formatCurrency`. When omitted, inherits from
   * `<PayProvider locale={…}>` context (default `'en'`).
   */
  locale?: string
  className?: string
  /** Reserved for future detail view. Currently unused. */
  showPricing?: boolean
}

/**
 * Fetch both active and inactive plans so the manager can display status.
 * The public `listPlans` endpoint only returns `active=true` plans by
 * default — we call it twice and merge.
 */
async function fetchAllPlans(
  client: ReturnType<typeof usePayContext>['client'],
  applicationId: string
): Promise<Plan[]> {
  const [activeRes, inactiveRes] = await Promise.all([
    client.listPlans({ applicationId, active: true, limit: 100 }),
    client
      .listPlans({ applicationId, active: false, limit: 100 })
      .catch(() => ({ success: true, data: [], meta: { total: 0, limit: 0, offset: 0 } })),
  ])
  const merged = [...(activeRes.data ?? []), ...(inactiveRes.data ?? [])]
  return merged.sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder
    return a.name.localeCompare(b.name)
  })
}

export function PlansManager({
  applicationId,
  texts: partialTexts,
  locale,
  className,
}: PlansManagerProps) {
  const texts = mergeTexts(partialTexts)
  const { client } = usePayContext()
  const contextLocale = usePayLocale()
  const resolvedLocale = locale ?? contextLocale

  const [plans, setPlans] = useState<Plan[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null)
  const [archiveTarget, setArchiveTarget] = useState<Plan | null>(null)
  const [isArchiving, setIsArchiving] = useState(false)

  const reload = useCallback(async () => {
    if (!applicationId) return
    setIsLoading(true)
    setLoadError(null)
    try {
      const all = await fetchAllPlans(client, applicationId)
      setPlans(all)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : texts.fetchFailed)
    } finally {
      setIsLoading(false)
    }
  }, [client, applicationId, texts.fetchFailed])

  useEffect(() => {
    reload()
  }, [reload])

  const handleCreate = useCallback(() => {
    setEditingPlan(null)
    setEditorOpen(true)
  }, [])

  const handleEdit = useCallback((plan: Plan) => {
    setEditingPlan(plan)
    setEditorOpen(true)
  }, [])

  const handleEditorClose = useCallback(() => {
    setEditorOpen(false)
    setEditingPlan(null)
  }, [])

  const handleEditorSaved = useCallback(() => {
    reload()
  }, [reload])

  const handleArchiveConfirm = useCallback(async () => {
    if (!archiveTarget) return
    setIsArchiving(true)
    try {
      await client.deletePlan(archiveTarget.id)
      toast.success(texts.toast.archived)
      setArchiveTarget(null)
      await reload()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : texts.toast.error)
    } finally {
      setIsArchiving(false)
    }
  }, [archiveTarget, client, reload, texts.toast.archived, texts.toast.error])

  const columns = useMemo<ColumnDef<Plan>[]>(() => {
    return [
      {
        accessorKey: 'name',
        header: texts.columns.name,
        cell: ({ row }) => (
          <Div className="flex flex-col">
            <P className="font-medium">{row.original.name}</P>
            {row.original.description && (
              <P className="text-xs text-muted-foreground line-clamp-1">
                {row.original.description}
              </P>
            )}
          </Div>
        ),
      },
      {
        accessorKey: 'amount',
        header: texts.columns.price,
        cell: ({ row }) => {
          const { amount, currency } = row.original
          return (
            <Span className="tabular-nums">
              {formatCurrency(amount / 100, currency, resolvedLocale)}
            </Span>
          )
        },
      },
      {
        accessorKey: 'interval',
        header: texts.columns.interval,
        cell: ({ row }) => {
          const { interval, intervalCount } = row.original
          const base = interval === 'month' ? texts.intervals.month : texts.intervals.year
          return (
            <Span className="text-sm">
              {intervalCount > 1 ? `${base} × ${intervalCount}` : base}
            </Span>
          )
        },
      },
      {
        accessorKey: 'active',
        header: texts.columns.status,
        cell: ({ row }) =>
          row.original.active ? (
            <Badge variant="success">{texts.status.active}</Badge>
          ) : (
            <Badge variant="secondary">{texts.status.inactive}</Badge>
          ),
      },
      {
        id: 'features',
        header: texts.columns.features,
        cell: ({ row }) => {
          const count = row.original.features?.length ?? 0
          return <Span className="text-sm text-muted-foreground">{count}</Span>
        },
        enableSorting: false,
      },
      {
        id: 'actions',
        header: texts.columns.actions,
        cell: ({ row }) => (
          <Div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleEdit(row.original)}
              disabled={isArchiving}
            >
              {texts.actions.edit}
            </Button>
            {row.original.active && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setArchiveTarget(row.original)}
                disabled={isArchiving}
              >
                {texts.actions.archive}
              </Button>
            )}
          </Div>
        ),
        enableSorting: false,
      },
    ]
  }, [texts, resolvedLocale, handleEdit, isArchiving])

  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <Div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <Div className="space-y-1">
            <CardTitle className="text-xl md:text-2xl font-bold">{texts.title}</CardTitle>
            <CardDescription>{texts.subtitle}</CardDescription>
          </Div>
          <Button onClick={handleCreate} disabled={!applicationId}>
            {texts.createButton}
          </Button>
        </Div>
      </CardHeader>

      <CardContent className="space-y-4">
        {isLoading && (
          <Div className="flex items-center justify-center min-h-[30vh]">
            <Spinner variant="primary" size="md" />
          </Div>
        )}

        {!isLoading && loadError && (
          <Div className="text-center space-y-3 py-8">
            <P className="text-destructive">{loadError}</P>
            <Button variant="outline" size="sm" onClick={reload}>
              {texts.retry}
            </Button>
          </Div>
        )}

        {!isLoading && !loadError && plans.length === 0 && (
          <P className="text-muted-foreground text-center py-8">{texts.empty}</P>
        )}

        {!isLoading && !loadError && plans.length > 0 && (
          <DataTable columns={columns} data={plans} pageSize={10} density="compact" />
        )}
      </CardContent>

      <PlanEditorDialog
        isOpen={editorOpen}
        onClose={handleEditorClose}
        applicationId={applicationId}
        plan={editingPlan ?? undefined}
        onSaved={handleEditorSaved}
        texts={texts.editor}
      />

      <AlertDialog
        open={!!archiveTarget}
        onOpenChange={open => !open && !isArchiving && setArchiveTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{texts.actions.archiveConfirm}</AlertDialogTitle>
            <AlertDialogDescription>
              {texts.actions.archiveConfirmDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isArchiving}>
              {texts.actions.archiveCancel}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleArchiveConfirm} disabled={isArchiving}>
              {texts.actions.archive}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
