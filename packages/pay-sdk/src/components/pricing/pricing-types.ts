/**
 * Type definitions and helpers shared by the PricingPage sub-components.
 *
 * @internal
 */

import type { Plan, PlanMetadata } from '../../core/types.js'

export type BillingCycle = 'month' | 'year'

export interface PricingPageTexts {
  title: string
  subtitle: string
  free: string
  perMonth: string
  perYear: string
  currentPlan: string
  upgrade: string
  getStarted: string
  popular: string
  loading: string
  errorLoading: string
  retry: string
  noPlans: string
  contactSales: string
  /** Toggle label for monthly billing. */
  billingMonthly: string
  /** Toggle label for yearly billing. */
  billingYearly: string
  /**
   * Template shown next to the Yearly toggle when at least one plan has
   * `metadata.discountVsMonthly`. Use `{percent}` placeholder.
   */
  saveTemplate: string
  /** Template for the trial badge. Use `{days}` placeholder. */
  trialBadgeTemplate: string
}

export const DEFAULT_PRICING_TEXTS: PricingPageTexts = {
  title: 'Choose your plan',
  subtitle: 'Start free, upgrade anytime',
  free: 'Free',
  perMonth: 'month',
  perYear: 'year',
  currentPlan: 'Current plan',
  upgrade: 'Upgrade',
  getStarted: 'Get started',
  popular: 'Most popular',
  loading: 'Loading plans...',
  errorLoading: 'Failed to load plans',
  retry: 'Retry',
  noPlans: 'No plans available',
  contactSales: 'Contact sales',
  billingMonthly: 'Monthly',
  billingYearly: 'Yearly',
  saveTemplate: 'Save {percent}%',
  trialBadgeTemplate: '{days} days free trial',
}

/**
 * Group plans by `metadata.billingGroup`, falling back to `name` for legacy
 * plans without the metadata. Within each group, plans are split by
 * `interval` so the toggle can switch between them.
 *
 * Plans that don't have a yearly variant keep their monthly card visible
 * regardless of the toggle state (graceful fallback).
 *
 * @internal
 */
export function groupPlansForToggle(plans: Plan[]): {
  groups: Map<string, { month?: Plan; year?: Plan }>
  hasYearly: boolean
  maxYearlyDiscount: number
} {
  const groups = new Map<string, { month?: Plan; year?: Plan }>()
  let hasYearly = false
  let maxYearlyDiscount = 0

  for (const plan of plans) {
    const metadata = (plan as Plan & { metadata?: PlanMetadata }).metadata
    const key = metadata?.billingGroup?.trim() || plan.name.trim()
    const existing = groups.get(key) ?? {}
    if (plan.interval === 'year') {
      existing.year = plan
      hasYearly = true
      if (
        typeof metadata?.discountVsMonthly === 'number' &&
        metadata.discountVsMonthly > maxYearlyDiscount
      ) {
        maxYearlyDiscount = metadata.discountVsMonthly
      }
    } else {
      existing.month = plan
    }
    groups.set(key, existing)
  }

  return { groups, hasYearly, maxYearlyDiscount }
}
