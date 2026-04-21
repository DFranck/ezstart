'use client'

import { useState } from 'react'
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
import type { Plan } from '../core/types.js'

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

  // Determine which plan index to feature (middle by default)
  const resolvedFeaturedIndex =
    featuredIndex !== undefined ? featuredIndex : Math.floor(plans.length / 2)

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

  return (
    <Div className={`w-full max-w-6xl mx-auto px-4 py-12 ${className || ''}`}>
      {/* Header */}
      <Div className="text-center mb-12">
        <H2 size="h1">{t.title}</H2>
        <P className="text-muted-foreground text-lg mt-2">{t.subtitle}</P>
      </Div>

      {/* Plans grid */}
      <Div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
        {plans.map((plan, index) => {
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
