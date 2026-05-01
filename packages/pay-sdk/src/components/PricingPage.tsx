'use client'

/**
 * Pricing page that fetches plans for an Application and renders one card per
 * plan with monthly/yearly toggle, "Most popular" highlight, trial badge and
 * subscribe CTA.
 *
 * Internally split into `./pricing/` sub-components:
 * - `PricingHeader` — title, subtitle, monthly/yearly toggle
 * - `PricingPlanCard` — single plan card (price, features, CTA)
 *
 * Peer dependencies: `@ezstart/ui` + an enclosing `<PayProvider>`.
 */

import { Button, Div, Icon, P, Skeleton } from '@ezstart/ui/components'
import { useMemo, useState } from 'react'
import { usePlans } from '../react/hooks/usePlans.js'
import { useSubscriptionStatus } from '../react/hooks/useSubscriptionStatus.js'
import { useApplicationContext, usePayLogger } from '../react/pay-provider.js'
import { formatCurrency } from '../core/format-currency.js'
import type { Plan } from '../core/types.js'
import {
  PayNotConfiguredCard,
  classifyPayError,
  type PayNotConfiguredTexts,
} from './common/PayNotConfiguredCard.js'
import { PricingHeader } from './pricing/PricingHeader.js'
import { PricingPlanCard } from './pricing/PricingPlanCard.js'
import {
  DEFAULT_PRICING_TEXTS,
  groupPlansForToggle,
  type BillingCycle,
  type PricingPageTexts,
} from './pricing/pricing-types.js'

// Re-export types + helpers that consumers import from this module.
export { groupPlansForToggle } from './pricing/pricing-types.js'
export type { PricingPageTexts } from './pricing/pricing-types.js'

export interface PricingPageProps {
  /**
   * @deprecated Use `applicationId` instead. Falls back to PayProvider context
   * when omitted.
   */
  appName?: string
  /**
   * Ezauth Application id this pricing page is scoped to. Takes precedence over
   * `appName`. When omitted, resolves from PayProvider context.
   */
  applicationId?: string
  /** User info for subscription checkout */
  userId?: string
  userEmail?: string
  userName?: string
  /** Index (0-based) of the plan to highlight as "popular". Defaults to middle plan. */
  featuredIndex?: number
  /** Customizable texts with English defaults */
  texts?: Partial<PricingPageTexts>
  /** Called when a plan CTA is clicked. If not provided, triggers Stripe checkout via SubscribeButton. */
  onSelectPlan?: (plan: Plan) => void
  /**
   * Default billing cycle selected when the page mounts. Defaults to
   * `'month'`. When no yearly variant is available across all plans, the
   * toggle is hidden entirely and all plans are shown as-is.
   */
  defaultBillingCycle?: BillingCycle
  /**
   * Overrides for the graceful fallback card rendered when plans fetch
   * fails or the PayProvider resolution failed. Keys are optional — English
   * defaults are used when omitted.
   */
  notConfiguredTexts?: PayNotConfiguredTexts
  /**
   * BCP-47 locale used to build the developer portal URL (e.g. `en`, `fr`).
   * When omitted, inherits from `<PayProvider locale={…}>` context
   * (default `'en'`).
   */
  locale?: string
  /**
   * Optional client-side plans prepended to the fetched plans. Useful to
   * surface a Free tier that isn't stored in the EZPay DB (no Stripe price,
   * `amount: 0`) without falling back to hardcoded pricing cards in the
   * consumer app. Each entry MUST set `amount: 0` for free tiers — paid
   * plans should always come from the DB so Stripe checkout can resolve a
   * `priceId`.
   *
   * @example
   * ```tsx
   * <PricingPage
   *   applicationId={appId}
   *   additionalPlans={[{
   *     id: 'free',
   *     name: 'Free',
   *     amount: 0,
   *     currency: 'EUR',
   *     interval: 'month',
   *     intervalCount: 1,
   *     features: ['1 application', '1k auths/month'],
   *     description: 'Perfect for trying out',
   *     active: true,
   *     sortOrder: 0,
   *     appName: 'ezauth',
   *     createdAt: new Date().toISOString(),
   *     updatedAt: new Date().toISOString(),
   *   }]}
   * />
   * ```
   */
  additionalPlans?: Plan[]
  /** Additional CSS class */
  className?: string
}

export function PricingPage({
  appName,
  applicationId,
  userId,
  userEmail,
  userName,
  featuredIndex,
  texts: textsProp,
  onSelectPlan,
  defaultBillingCycle = 'month',
  notConfiguredTexts,
  locale,
  additionalPlans,
  className,
}: PricingPageProps) {
  const t = { ...DEFAULT_PRICING_TEXTS, ...textsProp }
  const log = usePayLogger()

  // Emit deprecation warning once when appName is used without applicationId.
  if (appName && !applicationId && typeof window !== 'undefined') {
    log.warn(
      '[pay-sdk] PricingPage `appName` prop is deprecated, use `applicationId` instead. ' +
        'Falling back to legacy appName resolution.'
    )
  }

  const {
    applicationId: ctxApplicationId,
    applicationResolutionStatus,
    payWebUrl,
    locale: contextLocale,
  } = useApplicationContext()
  const effectiveApplicationId = applicationId ?? ctxApplicationId ?? undefined
  const resolvedLocale = locale ?? contextLocale
  const dashboardUrl = payWebUrl ? `${payWebUrl}/${resolvedLocale}/developer` : undefined

  const {
    plans: fetchedPlans,
    isLoading,
    error,
    reload,
  } = usePlans({
    applicationId,
    appName,
    active: true,
  })
  const subStatus = useSubscriptionStatus({
    userId: userId || '',
    applicationId,
    appName,
  })

  const currentPlanName = subStatus.plan

  // Merge consumer-supplied plans (e.g. a synthetic Free tier) with plans
  // fetched from the DB. Additional plans are prepended so they sit first
  // in the grid by default — `sortOrder` still wins via the visible-plans
  // sort below.
  const plans = useMemo<Plan[]>(() => {
    if (!additionalPlans || additionalPlans.length === 0) return fetchedPlans
    return [...additionalPlans, ...fetchedPlans]
  }, [fetchedPlans, additionalPlans])

  // Group Monthly/Yearly variants (P9-B) so the toggle can swap between them.
  const { groups, hasYearly, maxYearlyDiscount } = useMemo(
    () => groupPlansForToggle(plans),
    [plans]
  )

  const [billingCycle, setBillingCycle] = useState<BillingCycle>(defaultBillingCycle)

  // Visible plans = one Plan per group, matching the selected cycle (falling
  // back to the other cycle when the variant is missing).
  const visiblePlans = useMemo<Plan[]>(() => {
    const result: Plan[] = []
    for (const group of groups.values()) {
      const preferred = billingCycle === 'year' ? group.year : group.month
      const fallback = billingCycle === 'year' ? group.month : group.year
      if (preferred) result.push(preferred)
      else if (fallback) result.push(fallback)
    }
    return result.sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder
      return a.amount - b.amount
    })
  }, [groups, billingCycle])

  // Determine which plan index to feature (middle by default).
  //
  // When there is only ONE plan visible total (e.g. just Pro, no Free),
  // a "Most popular" badge becomes a paradox — there's nothing to compare
  // against. We only auto-feature when there are at least 2 plans visible,
  // or when the consumer explicitly opts in via `featuredIndex`. The
  // existing `!isFree` guard at the render site still ensures the badge
  // never lands on a free tier.
  const resolvedFeaturedIndex =
    featuredIndex !== undefined
      ? featuredIndex
      : visiblePlans.length >= 2
        ? Math.floor(visiblePlans.length / 2)
        : -1

  if (isLoading) {
    return (
      <Div className={`w-full max-w-6xl mx-auto px-4 py-12 ${className || ''}`}>
        <Div className="text-center mb-12">
          <Skeleton className="h-10 w-64 mx-auto mb-4" />
          <Skeleton className="h-6 w-80 mx-auto" />
        </Div>
        <Div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Skeleton className="h-96 rounded-xl" />
          <Skeleton className="h-96 rounded-xl" />
          <Skeleton className="h-96 rounded-xl" />
        </Div>
      </Div>
    )
  }

  // Pay provider resolution failed — render a graceful "Get your key" CTA
  // rather than the plans error screen (which can't help the user).
  if (applicationResolutionStatus === 'failed') {
    return (
      <Div className={`w-full max-w-6xl mx-auto px-4 py-12 ${className || ''}`}>
        <PayNotConfiguredCard
          reason="resolve-failed"
          dashboardUrl={dashboardUrl}
          texts={notConfiguredTexts}
        />
      </Div>
    )
  }

  if (error) {
    // Classify the error — network failures get a "service unreachable" card,
    // auth failures get "invalid key", everything else gets the generic retry
    // UI (which is still valuable: plans can be reloaded without a new key).
    const reason = classifyPayError(error)
    if (reason) {
      return (
        <Div className={`w-full max-w-6xl mx-auto px-4 py-12 ${className || ''}`}>
          <PayNotConfiguredCard
            reason={reason}
            dashboardUrl={dashboardUrl}
            texts={notConfiguredTexts}
          />
        </Div>
      )
    }
    return (
      <Div className={`w-full max-w-6xl mx-auto px-4 py-12 text-center ${className || ''}`}>
        <Icon name="lucide:AlertTriangle" className="w-12 h-12 text-destructive mx-auto mb-4" />
        <P className="text-destructive mb-4">{t.errorLoading}</P>
        <Button variant="outline" onClick={reload}>
          {t.retry}
        </Button>
      </Div>
    )
  }

  if (plans.length === 0) {
    return (
      <Div className={`w-full max-w-6xl mx-auto px-4 py-12 text-center ${className || ''}`}>
        <P className="text-muted-foreground">{t.noPlans}</P>
      </Div>
    )
  }

  const savingsLabel =
    maxYearlyDiscount > 0
      ? t.saveTemplate.replace('{percent}', String(Math.round(maxYearlyDiscount)))
      : null

  return (
    <Div className={`w-full max-w-6xl mx-auto px-4 py-12 ${className || ''}`}>
      <PricingHeader
        texts={t}
        hasYearly={hasYearly}
        billingCycle={billingCycle}
        onCycleChange={setBillingCycle}
        savingsLabel={savingsLabel}
      />

      <Div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
        {visiblePlans.map((plan, index) => {
          const isFree = plan.amount === 0
          const isCurrent = currentPlanName === plan.name
          const isFeatured = index === resolvedFeaturedIndex && !isFree
          // Pass the resolved locale so EUR formats as "€19.00" on EN pages
          // and "19,00 €" on FR pages — without it, EUR falls back to the
          // deterministic per-currency default ("fr-FR") and produces a
          // comma-decimal on every locale.
          const price = isFree
            ? t.free
            : formatCurrency(plan.amount / 100, plan.currency, resolvedLocale)
          const intervalLabel = plan.interval === 'year' ? t.perYear : t.perMonth

          return (
            <PricingPlanCard
              key={plan.id}
              plan={plan}
              price={price}
              intervalLabel={intervalLabel}
              isFree={isFree}
              isCurrent={isCurrent}
              isFeatured={isFeatured}
              texts={t}
              applicationId={effectiveApplicationId}
              userId={userId}
              userEmail={userEmail}
              userName={userName}
              onSelectPlan={onSelectPlan}
            />
          )
        })}
      </Div>
    </Div>
  )
}
