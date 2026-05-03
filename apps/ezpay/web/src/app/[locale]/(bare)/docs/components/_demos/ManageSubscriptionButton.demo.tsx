'use client'

import { ManageSubscriptionButton } from '@ezstart/pay-sdk/components'
import { Div, P } from '@ezstart/ui/components'
import { DemoSandbox } from './_lib/DemoSandbox'

/**
 * Live preview for `<ManageSubscriptionButton>`. Single CTA that, when wired
 * to a signed-in user with an active subscription, opens the Stripe Customer
 * Portal. In the sandbox there is no logged-in user so clicking it surfaces a
 * graceful error — that's expected, the goal of the showcase is the visual.
 */
export default function Demo() {
  return (
    <DemoSandbox componentName="ManageSubscriptionButton">
      <Div className="flex flex-col items-center gap-3">
        <ManageSubscriptionButton />
        <P className="text-xs text-muted-foreground text-center max-w-xs">
          Pass `returnUrl` to control where Stripe redirects after the portal closes. `variant`,
          `texts` and `children` let you override the visual + copy.
        </P>
      </Div>
    </DemoSandbox>
  )
}
