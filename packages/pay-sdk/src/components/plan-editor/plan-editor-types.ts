/**
 * Type definitions and helpers shared by the PlanEditorDialog sub-components.
 *
 * Kept private to the `plan-editor/` folder — public consumers import the
 * top-level `PlanEditorDialog` component and its `PlanEditorDialogTexts`.
 *
 * @internal
 */

export type Currency = 'EUR' | 'USD' | 'GBP'
export type Interval = 'month' | 'year'

/**
 * Local copy of the plan metadata shape to avoid a circular import from core.
 * Kept in sync with `apps/ezpay/api/src/routes/plans/{createPlan,updatePlan}.ts`
 * and with `PlanMetadata` in `../../core/types.ts`.
 *
 * @internal
 */
export interface PlanMetadata {
  grantsRoles?: string[]
  grantsFeatures?: string[]
  feePercent?: number
  billingGroup?: string
  discountVsMonthly?: number
}

export interface PlanEditorDialogTexts {
  createTitle: string
  editTitle: string
  /**
   * Subtitle shown below the dialog title. Provided to Modal as the accessible
   * description so the modal's `aria-describedby` accessibility requirement is
   * satisfied (otherwise React logs a warning in dev).
   */
  dialogDescription: string
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
  trialDaysLabel: string
  trialDaysHelp: string
  billingGroupLabel: string
  billingGroupHelp: string
  discountVsMonthlyLabel: string
  discountVsMonthlyHelp: string
  sortOrderLabel: string
  activeLabel: string
  cancel: string
  save: string
  saving: string
  validation: {
    nameRequired: string
    amountInvalid: string
    intervalCountRange: string
    trialDaysRange: string
    discountVsMonthlyRange: string
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
  dialogDescription: 'Configure pricing, features and access grants for this plan.',
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
  trialDaysLabel: 'Trial period (days)',
  trialDaysHelp: 'Free-trial duration between 0 and 90 days. Leave at 0 to disable.',
  billingGroupLabel: 'Billing group',
  billingGroupHelp:
    'Logical identifier that links Monthly / Yearly variants of the same tier (e.g. "pro").',
  discountVsMonthlyLabel: 'Yearly savings vs. monthly (%)',
  discountVsMonthlyHelp: 'Displayed as "Save N%" on the pricing page toggle. Yearly plans only.',
  sortOrderLabel: 'Sort order',
  activeLabel: 'Active',
  cancel: 'Cancel',
  save: 'Save',
  saving: 'Saving...',
  validation: {
    nameRequired: 'Name is required',
    amountInvalid: 'Price must be a positive number',
    intervalCountRange: 'Interval count must be between 1 and 12',
    trialDaysRange: 'Trial days must be between 0 and 90',
    discountVsMonthlyRange: 'Yearly savings must be between 0 and 100',
  },
  toast: {
    created: 'Plan created',
    updated: 'Plan updated',
    error: 'An error occurred',
  },
}

export function mergePlanEditorTexts(
  partial?: Partial<PlanEditorDialogTexts>
): PlanEditorDialogTexts {
  if (!partial) return defaultPlanEditorDialogTexts
  return {
    ...defaultPlanEditorDialogTexts,
    ...partial,
    validation: { ...defaultPlanEditorDialogTexts.validation, ...partial.validation },
    toast: { ...defaultPlanEditorDialogTexts.toast, ...partial.toast },
  }
}

/** Parse a comma-separated string into a trimmed non-empty list. */
export function parseCsv(input: string): string[] {
  return input
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
}

/** Convert a UI-facing decimal string (e.g. "19.99") into integer cents. */
export function parseAmountToCents(input: string): number | null {
  const trimmed = input.trim()
  if (trimmed === '') return null
  // Accept "19", "19.5", "19.99", "19,99" (locale comma decimal).
  const normalised = trimmed.replace(',', '.')
  const n = Number(normalised)
  if (!Number.isFinite(n) || n < 0) return null
  return Math.round(n * 100)
}

/** Convert integer cents back into a decimal string for display (en-US style). */
export function formatCentsToAmount(cents: number): string {
  return (cents / 100).toFixed(2)
}

export interface PlanFormState {
  name: string
  description: string
  amount: string
  currency: Currency
  interval: Interval
  intervalCount: string
  features: string
  grantsRoles: string
  grantsFeatures: string
  trialDays: string
  billingGroup: string
  discountVsMonthly: string
  sortOrder: string
  active: boolean
}

export interface PlanFormFieldErrors {
  name?: string
  amount?: string
  intervalCount?: string
  trialDays?: string
  discountVsMonthly?: string
}

export interface PlanFormValidationResult {
  valid: boolean
  errors: PlanFormFieldErrors
  parsed?: {
    amountCents: number
    intervalCountN: number
    sortOrderN: number
    trialDaysN: number
    discountVsMonthlyN?: number
  }
}

export function validatePlanForm(
  state: PlanFormState,
  texts: PlanEditorDialogTexts
): PlanFormValidationResult {
  const errors: PlanFormFieldErrors = {}

  if (!state.name.trim()) {
    errors.name = texts.validation.nameRequired
  }

  const amountCents = parseAmountToCents(state.amount)
  if (amountCents === null) {
    errors.amount = texts.validation.amountInvalid
  }

  const intervalCountN = Number(state.intervalCount)
  if (!Number.isInteger(intervalCountN) || intervalCountN < 1 || intervalCountN > 12) {
    errors.intervalCount = texts.validation.intervalCountRange
  }

  const trialDaysN = Number(state.trialDays)
  if (!Number.isInteger(trialDaysN) || trialDaysN < 0 || trialDaysN > 90) {
    errors.trialDays = texts.validation.trialDaysRange
  }

  let discountVsMonthlyN: number | undefined
  if (state.discountVsMonthly.trim() !== '') {
    const n = Number(state.discountVsMonthly)
    if (!Number.isFinite(n) || n < 0 || n > 100) {
      errors.discountVsMonthly = texts.validation.discountVsMonthlyRange
    } else {
      discountVsMonthlyN = Math.round(n * 100) / 100
    }
  }

  const sortOrderN = Number(state.sortOrder)
  const safeSortOrder = Number.isFinite(sortOrderN) && sortOrderN >= 0 ? Math.round(sortOrderN) : 0

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
          trialDaysN,
          discountVsMonthlyN,
        },
  }
}
