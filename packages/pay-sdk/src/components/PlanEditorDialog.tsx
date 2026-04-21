'use client'

/**
 * Modal dialog to create or edit an EZPay subscription plan.
 *
 * Backed by {@link PayClient.createPlan} and {@link PayClient.updatePlan} via
 * `usePayContext().client`. Captures price (EUR units, converted to cents on
 * submit), interval, features, grants (roles/features) and active flag.
 *
 * Peer dependencies: `@ezstart/ui` + an enclosing `<PayProvider>`.
 */

import {
  Button,
  Div,
  Input,
  Label,
  Modal,
  P,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Textarea,
} from '@ezstart/ui/components'
import { toast } from '@ezstart/ui/utils'
import { useEffect, useState } from 'react'
import { usePayContext } from '../react/pay-provider.js'
import type { CreatePlanRequest, Plan, UpdatePlanRequest } from '../core/types.js'

type Currency = 'EUR' | 'USD' | 'GBP'
type Interval = 'month' | 'year'

/**
 * Backend accepts a structured `metadata` block on plan create/update. The
 * SDK core types (which we cannot extend from this layer) do not yet expose
 * it — we describe the shape locally and cast at submit time. Kept in sync
 * with `apps/ezpay/api/src/routes/plans/{createPlan,updatePlan}.ts`.
 *
 * @internal
 */
interface PlanMetadata {
  grantsRoles?: string[]
  grantsFeatures?: string[]
  feePercent?: number
}

export interface PlanEditorDialogTexts {
  createTitle: string
  editTitle: string
  nameLabel: string
  namePlaceholder: string
  descriptionLabel: string
  descriptionPlaceholder: string
  amountLabel: string
  amountPlaceholder: string
  currencyLabel: string
  intervalLabel: string
  intervalMonth: string
  intervalYear: string
  intervalCountLabel: string
  intervalCountHelp: string
  featuresLabel: string
  featuresHelp: string
  grantsRolesLabel: string
  grantsRolesHelp: string
  grantsFeaturesLabel: string
  grantsFeaturesHelp: string
  sortOrderLabel: string
  activeLabel: string
  cancel: string
  save: string
  saving: string
  validation: {
    nameRequired: string
    amountInvalid: string
    intervalCountRange: string
  }
  toast: {
    created: string
    updated: string
    error: string
  }
}

export const defaultPlanEditorDialogTexts: PlanEditorDialogTexts = {
  createTitle: 'Create a new plan',
  editTitle: 'Edit plan',
  nameLabel: 'Name',
  namePlaceholder: 'Pro',
  descriptionLabel: 'Description',
  descriptionPlaceholder: 'Professional plan with advanced features',
  amountLabel: 'Price',
  amountPlaceholder: '19.00',
  currencyLabel: 'Currency',
  intervalLabel: 'Billing interval',
  intervalMonth: 'Monthly',
  intervalYear: 'Yearly',
  intervalCountLabel: 'Interval count',
  intervalCountHelp: 'Bill every N months/years (default 1)',
  featuresLabel: 'Features',
  featuresHelp: 'Comma-separated features shown in PricingPage',
  grantsRolesLabel: 'Grants roles',
  grantsRolesHelp: 'Comma-separated roles granted to user on subscribe',
  grantsFeaturesLabel: 'Grants features',
  grantsFeaturesHelp: 'Comma-separated features granted',
  sortOrderLabel: 'Sort order',
  activeLabel: 'Active',
  cancel: 'Cancel',
  save: 'Save',
  saving: 'Saving...',
  validation: {
    nameRequired: 'Name is required',
    amountInvalid: 'Price must be a positive number',
    intervalCountRange: 'Interval count must be between 1 and 12',
  },
  toast: {
    created: 'Plan created',
    updated: 'Plan updated',
    error: 'An error occurred',
  },
}

function mergeTexts(partial?: Partial<PlanEditorDialogTexts>): PlanEditorDialogTexts {
  if (!partial) return defaultPlanEditorDialogTexts
  return {
    ...defaultPlanEditorDialogTexts,
    ...partial,
    validation: { ...defaultPlanEditorDialogTexts.validation, ...partial.validation },
    toast: { ...defaultPlanEditorDialogTexts.toast, ...partial.toast },
  }
}

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

/** Parse a comma-separated string into a trimmed non-empty list. */
function parseCsv(input: string): string[] {
  return input
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
}

/** Convert a UI-facing decimal string (e.g. "19.99") into integer cents. */
function parseAmountToCents(input: string): number | null {
  const trimmed = input.trim()
  if (trimmed === '') return null
  // Accept "19", "19.5", "19.99", "19,99" (locale comma decimal).
  const normalised = trimmed.replace(',', '.')
  const n = Number(normalised)
  if (!Number.isFinite(n) || n < 0) return null
  return Math.round(n * 100)
}

/** Convert integer cents back into a decimal string for display (en-US style). */
function formatCentsToAmount(cents: number): string {
  return (cents / 100).toFixed(2)
}

export function PlanEditorDialog({
  isOpen,
  onClose,
  applicationId,
  plan,
  onSaved,
  texts: partialTexts,
}: PlanEditorDialogProps) {
  const texts = mergeTexts(partialTexts)
  const { client } = usePayContext()

  const isEdit = !!plan

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState<Currency>('EUR')
  const [interval, setInterval] = useState<Interval>('month')
  const [intervalCount, setIntervalCount] = useState('1')
  const [features, setFeatures] = useState('')
  const [grantsRoles, setGrantsRoles] = useState('')
  const [grantsFeatures, setGrantsFeatures] = useState('')
  const [sortOrder, setSortOrder] = useState('0')
  const [active, setActive] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string
    amount?: string
    intervalCount?: string
  }>({})
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Reset form state on open / plan change.
  useEffect(() => {
    if (!isOpen) return
    if (plan) {
      const metadata = (plan as Plan & { metadata?: PlanMetadata }).metadata
      setName(plan.name)
      setDescription(plan.description ?? '')
      setAmount(formatCentsToAmount(plan.amount))
      setCurrency((plan.currency?.toUpperCase() as Currency) ?? 'EUR')
      setInterval(plan.interval)
      setIntervalCount(String(plan.intervalCount ?? 1))
      setFeatures((plan.features ?? []).join(', '))
      setGrantsRoles((metadata?.grantsRoles ?? []).join(', '))
      setGrantsFeatures((metadata?.grantsFeatures ?? []).join(', '))
      setSortOrder(String(plan.sortOrder ?? 0))
      setActive(plan.active)
    } else {
      setName('')
      setDescription('')
      setAmount('')
      setCurrency('EUR')
      setInterval('month')
      setIntervalCount('1')
      setFeatures('')
      setGrantsRoles('')
      setGrantsFeatures('')
      setSortOrder('0')
      setActive(true)
    }
    setFieldErrors({})
    setSubmitError(null)
  }, [isOpen, plan])

  function validate(): {
    valid: boolean
    errors: { name?: string; amount?: string; intervalCount?: string }
    parsed?: {
      amountCents: number
      intervalCountN: number
      sortOrderN: number
    }
  } {
    const errors: { name?: string; amount?: string; intervalCount?: string } = {}

    if (!name.trim()) {
      errors.name = texts.validation.nameRequired
    }

    const amountCents = parseAmountToCents(amount)
    if (amountCents === null) {
      errors.amount = texts.validation.amountInvalid
    }

    const intervalCountN = Number(intervalCount)
    if (!Number.isInteger(intervalCountN) || intervalCountN < 1 || intervalCountN > 12) {
      errors.intervalCount = texts.validation.intervalCountRange
    }

    const sortOrderN = Number(sortOrder)
    const safeSortOrder =
      Number.isFinite(sortOrderN) && sortOrderN >= 0 ? Math.round(sortOrderN) : 0

    const hasErrors = Object.keys(errors).length > 0
    return {
      valid: !hasErrors,
      errors,
      parsed: hasErrors
        ? undefined
        : {
            amountCents: amountCents ?? 0,
            intervalCountN,
            sortOrderN: safeSortOrder,
          },
    }
  }

  async function handleSubmit() {
    const result = validate()
    setFieldErrors(result.errors)
    setSubmitError(null)
    if (!result.valid || !result.parsed) return

    setIsSubmitting(true)
    const metadata: PlanMetadata = {}
    const roles = parseCsv(grantsRoles)
    const feats = parseCsv(grantsFeatures)
    if (roles.length > 0) metadata.grantsRoles = roles
    if (feats.length > 0) metadata.grantsFeatures = feats

    try {
      if (isEdit && plan) {
        const payload: UpdatePlanRequest & { metadata?: PlanMetadata } = {
          name: name.trim(),
          description: description.trim() || null,
          amount: result.parsed.amountCents,
          currency,
          interval,
          intervalCount: result.parsed.intervalCountN,
          features: parseCsv(features),
          sortOrder: result.parsed.sortOrderN,
          active,
        }
        if (Object.keys(metadata).length > 0) payload.metadata = metadata
        const response = await client.updatePlan(plan.id, payload as UpdatePlanRequest)
        toast.success(texts.toast.updated)
        const saved =
          (response as { data?: { plan?: Plan }; plan?: Plan }).data?.plan ??
          (response as { plan?: Plan }).plan
        if (saved && onSaved) onSaved(saved)
        onClose()
      } else {
        const payload: CreatePlanRequest & { metadata?: PlanMetadata } = {
          name: name.trim(),
          applicationId,
          description: description.trim() || undefined,
          amount: result.parsed.amountCents,
          currency,
          interval,
          intervalCount: result.parsed.intervalCountN,
          features: parseCsv(features),
          sortOrder: result.parsed.sortOrderN,
        }
        if (Object.keys(metadata).length > 0) payload.metadata = metadata
        const response = await client.createPlan(payload as CreatePlanRequest)
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
        <Div className="space-y-2">
          <Label htmlFor="plan-name">{texts.nameLabel}</Label>
          <Input
            id="plan-name"
            placeholder={texts.namePlaceholder}
            value={name}
            onChange={e => setName(e.target.value)}
            maxLength={100}
            aria-invalid={!!fieldErrors.name}
          />
          {fieldErrors.name && <P className="text-xs text-destructive">{fieldErrors.name}</P>}
        </Div>

        <Div className="space-y-2">
          <Label htmlFor="plan-description">{texts.descriptionLabel}</Label>
          <Textarea
            id="plan-description"
            placeholder={texts.descriptionPlaceholder}
            value={description}
            onChange={e => setDescription(e.target.value)}
            maxLength={500}
            rows={2}
          />
        </Div>

        <Div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Div className="space-y-2">
            <Label htmlFor="plan-amount">{texts.amountLabel}</Label>
            <Input
              id="plan-amount"
              inputMode="decimal"
              placeholder={texts.amountPlaceholder}
              value={amount}
              onChange={e => setAmount(e.target.value)}
              aria-invalid={!!fieldErrors.amount}
            />
            {fieldErrors.amount && <P className="text-xs text-destructive">{fieldErrors.amount}</P>}
          </Div>

          <Div className="space-y-2">
            <Label>{texts.currencyLabel}</Label>
            <Select value={currency} onValueChange={v => setCurrency(v as Currency)}>
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
        </Div>

        <Div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Div className="space-y-2">
            <Label>{texts.intervalLabel}</Label>
            <Select value={interval} onValueChange={v => setInterval(v as Interval)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">{texts.intervalMonth}</SelectItem>
                <SelectItem value="year">{texts.intervalYear}</SelectItem>
              </SelectContent>
            </Select>
          </Div>

          <Div className="space-y-2">
            <Label htmlFor="plan-interval-count">{texts.intervalCountLabel}</Label>
            <Input
              id="plan-interval-count"
              type="number"
              min={1}
              max={12}
              value={intervalCount}
              onChange={e => setIntervalCount(e.target.value)}
              aria-invalid={!!fieldErrors.intervalCount}
            />
            {fieldErrors.intervalCount ? (
              <P className="text-xs text-destructive">{fieldErrors.intervalCount}</P>
            ) : (
              <P className="text-xs text-muted-foreground">{texts.intervalCountHelp}</P>
            )}
          </Div>
        </Div>

        <Div className="space-y-2">
          <Label htmlFor="plan-features">{texts.featuresLabel}</Label>
          <Input
            id="plan-features"
            value={features}
            onChange={e => setFeatures(e.target.value)}
            placeholder="Feature 1, Feature 2"
          />
          <P className="text-xs text-muted-foreground">{texts.featuresHelp}</P>
        </Div>

        <Div className="space-y-2">
          <Label htmlFor="plan-grants-roles">{texts.grantsRolesLabel}</Label>
          <Input
            id="plan-grants-roles"
            value={grantsRoles}
            onChange={e => setGrantsRoles(e.target.value)}
            placeholder="pro, premium"
          />
          <P className="text-xs text-muted-foreground">{texts.grantsRolesHelp}</P>
        </Div>

        <Div className="space-y-2">
          <Label htmlFor="plan-grants-features">{texts.grantsFeaturesLabel}</Label>
          <Input
            id="plan-grants-features"
            value={grantsFeatures}
            onChange={e => setGrantsFeatures(e.target.value)}
            placeholder="advanced_analytics, sso"
          />
          <P className="text-xs text-muted-foreground">{texts.grantsFeaturesHelp}</P>
        </Div>

        <Div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Div className="space-y-2">
            <Label htmlFor="plan-sort-order">{texts.sortOrderLabel}</Label>
            <Input
              id="plan-sort-order"
              type="number"
              min={0}
              value={sortOrder}
              onChange={e => setSortOrder(e.target.value)}
            />
          </Div>

          <Div className="flex items-center justify-between gap-2 pt-6">
            <Label htmlFor="plan-active">{texts.activeLabel}</Label>
            <Switch id="plan-active" checked={active} onCheckedChange={setActive} />
          </Div>
        </Div>

        {submitError && (
          <P className="text-xs text-destructive" role="alert">
            {submitError}
          </P>
        )}
      </Div>
    </Modal>
  )
}
