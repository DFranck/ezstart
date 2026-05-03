'use client'

import { UserPaymentDashboard } from '@ezstart/pay-sdk/components'
import { Div, P } from '@ezstart/ui/components'
import { DemoSandbox } from './_lib/DemoSandbox'

/**
 * Live preview for `<UserPaymentDashboard>`. The component renders a tabbed
 * view (Donations / Purchases / Subscriptions / All) populated by the
 * matching pay-sdk hooks. Without an authenticated user in the sandbox the
 * tabs render empty-state chrome, which still demonstrates the layout and
 * the active-subscription card pattern.
 */
export default function Demo() {
  return (
    <DemoSandbox componentName="UserPaymentDashboard">
      <Div className="flex flex-col items-center gap-3 w-full">
        <UserPaymentDashboard className="w-full max-w-3xl" />
        <P className="text-xs text-muted-foreground text-center max-w-md">
          Toggle `showDonations`, `showPurchases`, `showSubscriptions` to control which tabs appear.
          `onCancelSubscription` lets the SubscriptionCard wire its cancel CTA.
        </P>
      </Div>
    </DemoSandbox>
  )
}
