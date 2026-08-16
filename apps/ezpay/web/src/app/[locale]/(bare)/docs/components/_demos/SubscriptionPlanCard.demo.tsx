'use client'

import { SubscriptionPlanCard } from '@ezstart/pay-sdk/components'
import { Div, P } from '@ezstart/ui/components'
import { DemoSandbox } from './_lib/DemoSandbox'

/**
 * Live preview for `<SubscriptionPlanCard>`. The component fetches the
 * matching plan from the sandbox `<PayProvider>` via `client.listPlans`
 * and renders it with features, price, and an embedded `<SubscribeButton>`.
 * Renders `null` if no matching plan exists in the sandbox dataset.
 */
export default function Demo() {
  return (
    <DemoSandbox componentName="SubscriptionPlanCard">
      <Div className="flex flex-col items-center gap-3 w-full">
        <Div className="w-full max-w-sm">
          <SubscriptionPlanCard planName="Pro" variant="featured" />
        </Div>
        <P className="text-xs text-muted-foreground text-center max-w-xs">
          Looks up the plan by `planName` (or `planId`) from the sandbox API. Pass
          `variant=&quot;compact&quot;` for an inline row, `variant=&quot;featured&quot;` to
          highlight as the most popular option.
        </P>
      </Div>
    </DemoSandbox>
  )
}
