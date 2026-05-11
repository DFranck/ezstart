'use client'

/**
 * Drop-in dashboard for managing EZPay subscription plans for a single
 * ezauth Application.
 *
 * Surfaces CRUD on plans via `PayClient.listPlans`, `PayClient.createPlan`,
 * `PayClient.updatePlan` and `PayClient.deletePlan`. The Stripe product/price
 * is synced on the backend when a plan is created or updated — there is no
 * direct Stripe integration on the client.
 *
 * Internally split into `./plans-manager/` sub-components (column defs, archive
 * dialog) and the `PlanEditorDialog` for create/edit.
 *
 * Peer dependencies: `@ezstart/ui` + an enclosing `<PayProvider>`.
 */

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DataTable,
  Div,
  P,
  Spinner,
} from '@ezstart/ui/components'
import { toast } from '@ezstart/ui/utils'
import { useCallback, useEffect, useState } from 'react'
import type { Plan } from '../core/types.js'
import { useApplicationContext, usePayContext, usePayLocale } from '../react/pay-provider.js'
import { PlanEditorDialog } from './PlanEditorDialog.js'
import { PlanArchiveDialog } from './plans-manager/PlanArchiveDialog.js'
import {
  defaultPlansManagerTexts,
  mergePlansManagerTexts,
  type PlansManagerTexts,
} from './plans-manager/plans-manager-types.js'
import { usePlansColumns } from './plans-manager/use-plans-columns.js'

export {
  defaultPlansManagerTexts,
  type PlansManagerTexts,
} from './plans-manager/plans-manager-types.js'

export interface PlansManagerProps {
  applicationId?: string
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
  applicationId: applicationIdProp,
  texts: partialTexts,
  locale,
  className,
}: PlansManagerProps) {
  const texts = mergePlansManagerTexts(partialTexts)
  const { client } = usePayContext()
  const { applicationId: ctxApplicationId } = useApplicationContext()
  const applicationId = applicationIdProp ?? ctxApplicationId ?? ''
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

  const handleArchive = useCallback((plan: Plan) => {
    setArchiveTarget(plan)
  }, [])

  const handleArchiveCancel = useCallback(() => {
    setArchiveTarget(null)
  }, [])

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

  const columns = usePlansColumns({
    texts,
    resolvedLocale,
    isArchiving,
    onEdit: handleEdit,
    onArchive: handleArchive,
  })

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
            <Spinner variant="primary" size="default" />
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

      <PlanArchiveDialog
        target={archiveTarget}
        isArchiving={isArchiving}
        onConfirm={handleArchiveConfirm}
        onCancel={handleArchiveCancel}
        texts={texts}
      />
    </Card>
  )
}
