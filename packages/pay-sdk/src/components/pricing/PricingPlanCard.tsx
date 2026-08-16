'use client'

/**
 * Single plan card rendered inside the PricingPage grid.
 *
 * Pure presentational — receives derived display values (price string, current/
 * featured/free flags) and either an explicit `onSelectPlan` callback or wires
 * a `<SubscribeButton>` for paid plans.
 *
 * @internal
 */

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
  Span,
} from '@ezstart/ui/components'
import type { Plan } from '../../core/types.js'
import { SubscribeButton } from '../SubscribeButton.js'
import type { PricingPageTexts } from './pricing-types.js'

export interface PricingPlanCardProps {
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

export function PricingPlanCard({
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
}: PricingPlanCardProps) {
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
