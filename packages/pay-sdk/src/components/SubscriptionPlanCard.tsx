'use client'

import { useEffect, useState } from 'react'
import { usePayContext, useApplicationContext } from '../react/pay-provider.js'
import type { Plan } from '../core/types.js'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  Div,
  H3,
  Icon,
  P,
  Skeleton,
  Span,
} from '@ezstart/ui/components'
import { SubscribeButton } from './SubscribeButton.js'
import { formatCurrency } from '../core/format-currency.js'

export interface SubscriptionPlanCardProps {
  /**
   * @deprecated Use `applicationId` instead. Kept for backward compatibility.
   */
  appName?: string
  /** Ezauth Application id (preferred over `appName`). Falls back to context when absent. */
  applicationId?: string
  planId?: string
  planName?: string
  className?: string
  variant?: 'default' | 'featured' | 'compact'
  promoCode?: string
  onSuccess?: () => void
  onCancel?: () => void
  userId?: string
  userEmail?: string
  userName?: string
  texts?: Partial<SubscriptionPlanCardTexts>
}

export interface SubscriptionPlanCardTexts {
  subscribe: string
  perMonth: string
  perYear: string
  features: string
  mostPopular: string
  loading: string
  error: string
}

const DEFAULT_TEXTS: SubscriptionPlanCardTexts = {
  subscribe: 'Subscribe',
  perMonth: 'month',
  perYear: 'year',
  features: 'Features',
  mostPopular: 'Most popular',
  loading: 'Loading...',
  error: 'Plan not found',
}

export function SubscriptionPlanCard({
  appName,
  applicationId,
  planId,
  planName,
  className,
  variant = 'default',
  promoCode,
  userId,
  userEmail,
  userName,
  texts: textsProp,
}: SubscriptionPlanCardProps) {
  const { client } = usePayContext()
  const { applicationId: ctxApplicationId, appSlug: ctxAppSlug } = useApplicationContext()
  const [plan, setPlan] = useState<Plan | null>(null)
  const [loading, setLoading] = useState(true)
  const texts = { ...DEFAULT_TEXTS, ...textsProp }

  const effectiveApplicationId = applicationId ?? ctxApplicationId ?? undefined
  const effectiveAppName =
    appName ?? (effectiveApplicationId ? undefined : (ctxAppSlug ?? undefined))

  useEffect(() => {
    client
      .listPlans({
        applicationId: effectiveApplicationId,
        appName: effectiveAppName,
        active: true,
      })
      .then(res => {
        const plans = res.data || []
        const found = planId
          ? plans.find(p => p.id === planId)
          : plans.find(p => p.name === planName)
        setPlan(found || null)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [client, effectiveApplicationId, effectiveAppName, planId, planName])

  if (loading) {
    return <Skeleton className={`h-[400px] w-full rounded-xl`} />
  }

  if (!plan) return null

  const price = formatCurrency(plan.amount / 100, plan.currency)
  const intervalLabel = plan.interval === 'month' ? texts.perMonth : texts.perYear
  const isFeatured = variant === 'featured'
  const isCompact = variant === 'compact'

  if (isCompact) {
    return (
      <Card className={`flex flex-row items-center gap-4 p-4 ${className || ''}`}>
        <Div className={`flex-1 min-w-0`}>
          <H3 size="h5" className={`truncate`}>
            {plan.name}
          </H3>
          {plan.description && (
            <P size="sm" className={`text-muted-foreground truncate`}>
              {plan.description}
            </P>
          )}
        </Div>
        <Div className={`flex items-center gap-3 shrink-0`}>
          <Div className={`text-right`}>
            <Span className={`text-xl font-bold`}>{price}</Span>
            <Span className={`text-muted-foreground text-sm`}> / {intervalLabel}</Span>
          </Div>
          <SubscribeButton
            projectId={effectiveAppName ?? effectiveApplicationId ?? ''}
            applicationId={effectiveApplicationId}
            priceId={plan.stripePriceId || plan.id}
            planName={plan.name}
            amount={plan.amount / 100}
            intervalCount={plan.intervalCount}
            currency={plan.currency}
            userId={userId}
            userEmail={userEmail}
            userName={userName}
            promoCode={promoCode}
            showPromoInput={!!promoCode}
            trigger={<Button className={`shrink-0`}>{texts.subscribe}</Button>}
          />
        </Div>
      </Card>
    )
  }

  return (
    <Card
      className={`relative flex flex-col ${isFeatured ? 'border-primary shadow-lg scale-105' : ''} ${className || ''}`}
    >
      {isFeatured && (
        <Badge className={`absolute -top-3 left-1/2 -translate-x-1/2`} variant="default">
          {texts.mostPopular}
        </Badge>
      )}
      <CardHeader>
        <H3>{plan.name}</H3>
        {plan.description && <P className={`text-muted-foreground text-sm`}>{plan.description}</P>}
        <Div className={`mt-4`}>
          <Span className={`text-3xl font-bold`}>{price}</Span>
          <Span className={`text-muted-foreground`}> / {intervalLabel}</Span>
        </Div>
      </CardHeader>
      <CardContent className={`flex-1`}>
        {plan.features && plan.features.length > 0 && (
          <Div className={`space-y-2`}>
            {plan.features.map((feature, i) => (
              <Div key={i} className={`flex items-center gap-2`}>
                <Icon name="lucide:Check" className={`w-4 h-4 text-success shrink-0`} />
                <Span className={`text-sm`}>{feature}</Span>
              </Div>
            ))}
          </Div>
        )}
      </CardContent>
      <CardFooter>
        <SubscribeButton
          projectId={effectiveAppName ?? effectiveApplicationId ?? ''}
          applicationId={effectiveApplicationId}
          priceId={plan.stripePriceId || plan.id}
          planName={plan.name}
          amount={plan.amount / 100}
          intervalCount={plan.intervalCount}
          currency={plan.currency}
          userId={userId}
          userEmail={userEmail}
          userName={userName}
          promoCode={promoCode}
          showPromoInput
          className={`w-full`}
        />
      </CardFooter>
    </Card>
  )
}
