'use client'

import { ChangePlanButton } from '@ezstart/pay-sdk/components'
import { Div, P } from '@ezstart/ui/components'
import { DemoSandbox } from './_lib/DemoSandbox'

/**
 * Live preview for `<ChangePlanButton>`. Renders a button that opens an
 * `<AlertDialog>` with a proration `<Select>` and a confirm CTA. The
 * confirm calls `client.changeSubscriptionPlan` against the sandbox API
 * (no-op in the demo since the mock subscription id does not exist).
 */
export default function Demo() {
  return (
    <DemoSandbox componentName="ChangePlanButton">
      <Div className="flex flex-col items-center gap-3">
        <ChangePlanButton
          subscriptionId="sub_demo_pro_monthly"
          currentPlanId="plan_pro_monthly"
          currentPlanName="Pro Monthly"
          targetPlanId="plan_pro_yearly"
          targetPlanName="Pro Yearly"
        />
        <P className="text-xs text-muted-foreground text-center max-w-xs">
          Click to open the confirmation dialog with a proration selector. Pass
          `hideProrationSelect` to skip the dropdown and use `defaultProrationBehavior`.
        </P>
      </Div>
    </DemoSandbox>
  )
}
