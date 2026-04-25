'use client'

/**
 * Modal dialog to create or edit an EZPay subscription plan.
 *
 * Backed by `PayClient.createPlan` and `PayClient.updatePlan` via
 * `usePayContext().client`. Captures price (EUR units, converted to cents on
 * submit), interval, features, grants (roles/features) and active flag.
 *
 * Internally split into three sub-sections living in `./plan-editor/`:
 * - `PlanFormGeneral` — name + description
 * - `PlanFormPricing` — amount, currency, interval, trial, billing group
 * - `PlanFormFeatures` — features, grants, sort order, active toggle
 *
 * Peer dependencies: `@ezstart/ui` + an enclosing `<PayProvider>`.
 */

import { Button, Div, Modal, P } from '@ezstart/ui/components'
import { toast } from '@ezstart/ui/utils'
import { useEffect, useState } from 'react'
import { usePayContext } from '../react/pay-provider.js'
import type { CreatePlanRequest, Plan, UpdatePlanRequest } from '../core/types.js'
import { PlanFormGeneral } from './plan-editor/PlanFormGeneral.js'
import { PlanFormPricing } from './plan-editor/PlanFormPricing.js'
import { PlanFormFeatures } from './plan-editor/PlanFormFeatures.js'
import {
  defaultPlanEditorDialogTexts,
  formatCentsToAmount,
  mergePlanEditorTexts,
  parseCsv,
  validatePlanForm,
  type Currency,
  type Interval,
  type PlanEditorDialogTexts,
  type PlanFormFieldErrors,
  type PlanFormState,
  type PlanMetadata,
} from './plan-editor/plan-editor-types.js'

export {
  defaultPlanEditorDialogTexts,
  type PlanEditorDialogTexts,
} from './plan-editor/plan-editor-types.js'

export interface PlanEditorDialogProps {
  isOpen: boolean
  onClose: () => void
  applicationId: string
  /** When provided, the dialog enters edit mode. Otherwise it creates. */
  plan?: Plan
  /** Optional callback invoked after a successful create/update. */
  onSaved?: (plan: Plan) => void
  texts?: Partial<PlanEditorDialogTexts>
}

const INITIAL_STATE: PlanFormState = {
  name: '',
  description: '',
  amount: '',
  currency: 'EUR',
  interval: 'month',
  intervalCount: '1',
  features: '',
  grantsRoles: '',
  grantsFeatures: '',
  trialDays: '0',
  billingGroup: '',
  discountVsMonthly: '',
  sortOrder: '0',
  active: true,
}

function planToState(plan: Plan): PlanFormState {
  const metadata = (plan as Plan & { metadata?: PlanMetadata }).metadata
  const planTrialDays = (plan as Plan & { trialDays?: number }).trialDays
  return {
    name: plan.name,
    description: plan.description ?? '',
    amount: formatCentsToAmount(plan.amount),
    currency: (plan.currency?.toUpperCase() as Currency) ?? 'EUR',
    interval: plan.interval,
    intervalCount: String(plan.intervalCount ?? 1),
    features: (plan.features ?? []).join(', '),
    grantsRoles: (metadata?.grantsRoles ?? []).join(', '),
    grantsFeatures: (metadata?.grantsFeatures ?? []).join(', '),
    trialDays: String(planTrialDays ?? 0),
    billingGroup: metadata?.billingGroup ?? '',
    discountVsMonthly:
      typeof metadata?.discountVsMonthly === 'number' ? String(metadata.discountVsMonthly) : '',
    sortOrder: String(plan.sortOrder ?? 0),
    active: plan.active,
  }
}

export function PlanEditorDialog({
  isOpen,
  onClose,
  applicationId,
  plan,
  onSaved,
  texts: partialTexts,
}: PlanEditorDialogProps) {
  const texts = mergePlanEditorTexts(partialTexts)
  const { client } = usePayContext()

  const isEdit = !!plan

  const [state, setState] = useState<PlanFormState>(INITIAL_STATE)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<PlanFormFieldErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Reset form state on open / plan change.
  useEffect(() => {
    if (!isOpen) return
    setState(plan ? planToState(plan) : INITIAL_STATE)
    setFieldErrors({})
    setSubmitError(null)
  }, [isOpen, plan])

  function update<K extends keyof PlanFormState>(key: K, value: PlanFormState[K]) {
    setState(prev => ({ ...prev, [key]: value }))
  }

  async function handleSubmit() {
    const result = validatePlanForm(state, texts)
    setFieldErrors(result.errors)
    setSubmitError(null)
    if (!result.valid || !result.parsed) return

    setIsSubmitting(true)
    const metadata: PlanMetadata = {}
    const roles = parseCsv(state.grantsRoles)
    const feats = parseCsv(state.grantsFeatures)
    if (roles.length > 0) metadata.grantsRoles = roles
    if (feats.length > 0) metadata.grantsFeatures = feats
    const billingGroupTrimmed = state.billingGroup.trim()
    if (billingGroupTrimmed.length > 0) metadata.billingGroup = billingGroupTrimmed
    if (result.parsed.discountVsMonthlyN !== undefined) {
      metadata.discountVsMonthly = result.parsed.discountVsMonthlyN
    }

    const trialDaysPayload = result.parsed.trialDaysN > 0 ? result.parsed.trialDaysN : 0

    try {
      if (isEdit && plan) {
        const payload: UpdatePlanRequest = {
          name: state.name.trim(),
          description: state.description.trim() || null,
          amount: result.parsed.amountCents,
          currency: state.currency,
          interval: state.interval,
          intervalCount: result.parsed.intervalCountN,
          features: parseCsv(state.features),
          sortOrder: result.parsed.sortOrderN,
          active: state.active,
          // Always send trialDays so clearing the field from a non-zero value
          // propagates to the backend. 0 disables the trial (equivalent to
          // "no trial").
          trialDays: trialDaysPayload,
        }
        if (Object.keys(metadata).length > 0) payload.metadata = metadata
        const response = await client.updatePlan(plan.id, payload)
        toast.success(texts.toast.updated)
        const saved =
          (response as { data?: { plan?: Plan }; plan?: Plan }).data?.plan ??
          (response as { plan?: Plan }).plan
        if (saved && onSaved) onSaved(saved)
        onClose()
      } else {
        const payload: CreatePlanRequest = {
          name: state.name.trim(),
          applicationId,
          description: state.description.trim() || undefined,
          amount: result.parsed.amountCents,
          currency: state.currency,
          interval: state.interval,
          intervalCount: result.parsed.intervalCountN,
          features: parseCsv(state.features),
          sortOrder: result.parsed.sortOrderN,
        }
        if (trialDaysPayload > 0) payload.trialDays = trialDaysPayload
        if (Object.keys(metadata).length > 0) payload.metadata = metadata
        const response = await client.createPlan(payload)
        toast.success(texts.toast.created)
        const saved =
          (response as { data?: { plan?: Plan }; plan?: Plan }).data?.plan ??
          (response as { plan?: Plan }).plan
        if (saved && onSaved) onSaved(saved)
        onClose()
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : texts.toast.error
      setSubmitError(message)
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleClose() {
    if (isSubmitting) return
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      size="lg"
      title={isEdit ? texts.editTitle : texts.createTitle}
      description={texts.dialogDescription}
      footer={
        <Div className="flex items-center justify-end gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            {texts.cancel}
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? texts.saving : texts.save}
          </Button>
        </Div>
      }
    >
      <Div className="space-y-4">
        <PlanFormGeneral
          name={state.name}
          description={state.description}
          onNameChange={v => update('name', v)}
          onDescriptionChange={v => update('description', v)}
          errors={fieldErrors}
          texts={texts}
        />

        <PlanFormPricing
          amount={state.amount}
          currency={state.currency}
          interval={state.interval}
          intervalCount={state.intervalCount}
          trialDays={state.trialDays}
          billingGroup={state.billingGroup}
          discountVsMonthly={state.discountVsMonthly}
          onAmountChange={v => update('amount', v)}
          onCurrencyChange={v => update('currency', v)}
          onIntervalChange={v => update('interval', v)}
          onIntervalCountChange={v => update('intervalCount', v)}
          onTrialDaysChange={v => update('trialDays', v)}
          onBillingGroupChange={v => update('billingGroup', v)}
          onDiscountVsMonthlyChange={v => update('discountVsMonthly', v)}
          errors={fieldErrors}
          texts={texts}
        />

        <PlanFormFeatures
          features={state.features}
          grantsRoles={state.grantsRoles}
          grantsFeatures={state.grantsFeatures}
          sortOrder={state.sortOrder}
          active={state.active}
          onFeaturesChange={v => update('features', v)}
          onGrantsRolesChange={v => update('grantsRoles', v)}
          onGrantsFeaturesChange={v => update('grantsFeatures', v)}
          onSortOrderChange={v => update('sortOrder', v)}
          onActiveChange={v => update('active', v)}
          texts={texts}
        />

        {submitError && (
          <P className="text-xs text-destructive" role="alert">
            {submitError}
          </P>
        )}
      </Div>
    </Modal>
  )
}
