// Plan Types

/**
 * Structured extras attached to a Plan. Mirrors `PlanMetadata` in the backend
 * (`apps/ezpay/api/src/models/Plan.ts`).
 */
export interface PlanMetadata {
  /** Roles granted to the user when the subscription activates (JWT claim materialisation). */
  grantsRoles?: string[]
  /** Features granted to the user when the subscription activates. */
  grantsFeatures?: string[]
  /** Platform application fee percent applied to Connect charges for this plan (0-100). */
  feePercent?: number
  /**
   * Logical grouping identifier that links a Monthly plan to its Yearly
   * variant. Two plans sharing the same `billingGroup` are treated as
   * alternative billing cycles of the same tier by PricingPage's
   * Monthly/Yearly toggle.
   */
  billingGroup?: string
  /**
   * Headline savings (in %) of the Yearly variant vs the Monthly variant in
   * the same billingGroup. Purely decorative (rendered as "Save 20%").
   */
  discountVsMonthly?: number
}

export interface Plan {
  id: string
  name: string
  /**
   * @deprecated Read `applicationId` instead. Retained while the backend
   * dual-writes during the 90-day migration window.
   */
  appName: string
  /** Ezauth Application id this plan belongs to. */
  applicationId?: string
  description?: string
  amount: number
  currency: string
  interval: 'month' | 'year'
  intervalCount: number
  features?: string[]
  active: boolean
  sortOrder: number
  stripePriceId?: string
  /**
   * Free-trial duration in days (0-90). `0` or `undefined` disables the
   * trial. Applied to Stripe Checkout subscription sessions via
   * `subscription_data.trial_period_days`.
   */
  trialDays?: number
  /** Structured extras: grants, fee %, billing group, yearly discount. */
  metadata?: PlanMetadata
  createdAt: string
  updatedAt: string
}

export interface CreatePlanRequest {
  name: string
  /**
   * @deprecated Use `applicationId` instead. Kept for backward compatibility.
   */
  appName?: string
  /** Ezauth Application id this plan belongs to. Takes precedence over `appName`. */
  applicationId?: string
  description?: string
  amount: number
  currency: string
  interval: 'month' | 'year'
  intervalCount: number
  features?: string[]
  sortOrder?: number
  stripePriceId?: string
  /** Free-trial duration in days (0-90). */
  trialDays?: number
  /** Structured extras — billingGroup, discountVsMonthly, grants, fee %. */
  metadata?: PlanMetadata
}

export interface UpdatePlanRequest {
  name?: string
  description?: string | null
  amount?: number
  currency?: string
  interval?: 'month' | 'year'
  intervalCount?: number
  features?: string[]
  active?: boolean
  sortOrder?: number
  stripePriceId?: string | null
  /** Free-trial duration in days (0-90). `null` clears the trial. */
  trialDays?: number | null
  /** Structured extras — pass `null` as individual entries to clear them. */
  metadata?: PlanMetadata
}

export interface PlanResponse {
  success: boolean
  data: {
    plan: Plan
  }
}

export interface PlansListResponse {
  success: boolean
  data: Plan[]
  meta: {
    total: number
    limit: number
    offset: number
  }
}
