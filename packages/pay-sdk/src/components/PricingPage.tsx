'use client'

import { useMemo, useState } from 'react'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  Div,
  H2,
  H3,
  Icon,
  P,
  Skeleton,
  Span,
} from '@ezstart/ui/components'
import { usePlans } from '../react/hooks/usePlans.js'
import { useSubscriptionStatus } from '../react/hooks/useSubscriptionStatus.js'
import { useApplicationContext } from '../react/pay-provider.js'
import { SubscribeButton } from './SubscribeButton.js'
import { formatCurrency } from '../core/format-currency.js'
import type { Plan, PlanMetadata } from '../core/types.js'

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

const DEFAULT_TEXTS: PricingPageTexts = {
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

type BillingCycle = 'month' | 'year'

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
  className,
}: PricingPageProps) {
  const t = { ...DEFAULT_TEXTS, ...textsProp }

  // Emit deprecation warning once when appName is used without applicationId.
  if (appName && !applicationId && typeof window !== 'undefined') {
    // eslint-disable-next-line no-console -- one-shot deprecation signal for SDK consumers
    console.warn(
      '[pay-sdk] PricingPage `appName` prop is deprecated, use `applicationId` instead. ' +
        'Falling back to legacy appName resolution.'
    )
  }

  const { applicationId: ctxApplicationId } = useApplicationContext()
  const effectiveApplicationId = applicationId ?? ctxApplicationId ?? undefined

  const { plans, isLoading, error, reload } = usePlans({ applicationId, appName, active: true })
  const subStatus = useSubscriptionStatus({
    userId: userId || '',
    applicationId,
    appName,
  })

  const currentPlanName = subStatus.plan

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

  // Determine which plan index to feature (middle by default)
  const resolvedFeaturedIndex =
    featuredIndex !== undefined ? featuredIndex : Math.floor(visiblePlans.length / 2)

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

  if (error) {
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
      {/* Header */}
      <Div className="text-center mb-8">
        <H2 size="h1">{t.title}</H2>
        <P className="text-muted-foreground text-lg mt-2">{t.subtitle}</P>
      </Div>

      {/* Monthly / Yearly toggle — only shown when at least one yearly variant exists */}
      {hasYearly && (
        <Div className="flex items-center justify-center gap-2 mb-10">
          <Div
            role="tablist"
            aria-label="Billing cycle"
            className="inline-flex items-center rounded-full border bg-muted p-1"
          >
            <Button
              type="button"
              role="tab"
              aria-selected={billingCycle === 'month'}
              variant={billingCycle === 'month' ? 'default' : 'ghost'}
              size="sm"
              className="rounded-full"
              onClick={() => setBillingCycle('month')}
            >
              {t.billingMonthly}
            </Button>
            <Button
              type="button"
              role="tab"
              aria-selected={billingCycle === 'year'}
              variant={billingCycle === 'year' ? 'default' : 'ghost'}
              size="sm"
              className="rounded-full"
              onClick={() => setBillingCycle('year')}
            >
              {t.billingYearly}
            </Button>
          </Div>
          {savingsLabel && (
            <Badge variant="success" className="ml-2">
              {savingsLabel}
            </Badge>
          )}
        </Div>
      )}

      {/* Plans grid */}
      <Div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
        {visiblePlans.map((plan, index) => {
          const isFree = plan.amount === 0
          const isCurrent = currentPlanName === plan.name
          const isFeatured = index === resolvedFeaturedIndex && !isFree
          const price = isFree ? t.free : formatCurrency(plan.amount / 100, plan.currency)
          const intervalLabel = plan.interval === 'year' ? t.perYear : t.perMonth

          return (
            <PlanCard
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

interface PlanCardProps {
  plan: Plan
  price: string
  intervalLabel: string
  isFree: boolean
  isCurrent: boolean
  isFeatured: boolean
  texts: PricingPageTexts
  applicationId?: string
  userId?: string
  userEmail?: string
  userName?: string
  onSelectPlan?: (plan: Plan) => void
}

function PlanCard({
  plan,
  price,
  intervalLabel,
  isFree,
  isCurrent,
  isFeatured,
  texts,
  applicationId,
  userId,
  userEmail,
  userName,
  onSelectPlan,
}: PlanCardProps) {
  const ctaLabel = isCurrent ? texts.currentPlan : isFree ? texts.getStarted : texts.upgrade
  const trialDays = (plan as Plan & { trialDays?: number }).trialDays
  const trialLabel =
    !isFree && typeof trialDays === 'number' && trialDays > 0
      ? texts.trialBadgeTemplate.replace('{days}', String(trialDays))
      : null

  return (
    <Card
      className={`relative flex flex-col ${isFeatured ? 'border-primary shadow-lg lg:scale-105' : ''}`}
    >
      {/* Badges */}
      {isFeatured && !isCurrent && (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2" variant="default">
          {texts.popular}
        </Badge>
      )}
      {isCurrent && (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2" variant="success">
          {texts.currentPlan}
        </Badge>
      )}

      <CardHeader>
        <H3>{plan.name}</H3>
        {plan.description && <P className="text-muted-foreground text-sm">{plan.description}</P>}
        <Div className="mt-4">
          <Span className="text-4xl font-bold">{price}</Span>
          {!isFree && <Span className="text-muted-foreground"> / {intervalLabel}</Span>}
        </Div>
        {trialLabel && (
          <Badge variant="info" className="mt-2 self-start">
            {trialLabel}
          </Badge>
        )}
      </CardHeader>

      <CardContent className="flex-1">
        {plan.features && plan.features.length > 0 && (
          <Div className="space-y-3">
            {plan.features.map((feature, i) => (
              <Div key={i} className="flex items-start gap-2">
                <Icon name="lucide:Check" className="w-4 h-4 text-success shrink-0 mt-0.5" />
                <Span className="text-sm">{feature}</Span>
              </Div>
            ))}
          </Div>
        )}
      </CardContent>

      <CardFooter>
        {onSelectPlan ? (
          <Button
            variant={isFeatured ? 'default' : 'outline'}
            className="w-full"
            disabled={isCurrent}
            onClick={() => onSelectPlan(plan)}
          >
            {ctaLabel}
          </Button>
        ) : isFree || isCurrent ? (
          <Button variant="outline" className="w-full" disabled={isCurrent}>
            {ctaLabel}
          </Button>
        ) : (
          <SubscribeButton
            projectId={plan.appName}
            applicationId={applicationId ?? plan.applicationId}
            priceId={plan.id}
            planName={plan.name}
            amount={plan.amount / 100}
            intervalCount={plan.intervalCount}
            currency={plan.currency}
            userId={userId}
            userEmail={userEmail}
            userName={userName}
            trialDays={(plan as Plan & { trialDays?: number }).trialDays}
            showPromoInput
            trigger={
              <Button variant={isFeatured ? 'default' : 'outline'} className="w-full">
                {ctaLabel}
              </Button>
            }
          />
        )}
      </CardFooter>
    </Card>
  )
}
