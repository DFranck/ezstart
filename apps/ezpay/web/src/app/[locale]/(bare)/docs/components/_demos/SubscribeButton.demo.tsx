'use client'

import { useApplicationContext, usePlans } from '@ezstart/pay-sdk'
import { SubscribeButton } from '@ezstart/pay-sdk/components'
import { Div, P, Skeleton } from '@ezstart/ui/components'
import { DemoSandbox } from './_lib/DemoSandbox'

function SubscribeButtonInner() {
  const { plans, isLoading } = usePlans({ active: true, limit: 5 })
  const { appSlug, applicationId, isReady } = useApplicationContext()

  if (!isReady || isLoading) {
    return <Skeleton className="h-10 w-36 rounded-md" />
  }

  const plan = plans[0]

  if (!plan) {
    return (
      <P className="text-sm text-muted-foreground text-center max-w-xs">
        No active plans configured. Create one via PlansManager first.
      </P>
    )
  }

  return (
    <SubscribeButton
      projectId={appSlug ?? applicationId ?? ''}
      priceId={plan.id}
      planName={plan.name}
      amount={plan.amount}
      currency={plan.currency}
      intervalCount={plan.intervalCount}
      description={plan.description}
      trialDays={plan.trialDays}
      showPromoInput
    />
  )
}

/**
 * Live preview for `<SubscribeButton>`. Fetches active plans from the sandbox
 * Application via `usePlans()` and renders the first result. If no plans are
 * configured yet, surfaces a "create a plan first" hint.
 */
export default function Demo() {
  return (
    <DemoSandbox componentName="SubscribeButton">
      <Div className="flex flex-col items-center gap-3">
        <SubscribeButtonInner />
        <P className="text-xs text-muted-foreground text-center max-w-xs">
          Plans fetched live from the sandbox Application. Pass `trialDays` to surface a free trial
          disclosure, or `showPromoInput` to expose an inline promo code field.
        </P>
      </Div>
    </DemoSandbox>
  )
}
