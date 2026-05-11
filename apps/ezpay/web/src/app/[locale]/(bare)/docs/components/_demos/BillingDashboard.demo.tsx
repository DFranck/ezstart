'use client'

import { BillingDashboard } from '@ezstart/pay-sdk/components'
import { Div, P } from '@ezstart/ui/components'
import { DemoSandbox } from './_lib/DemoSandbox'

/**
 * Live preview for `<BillingDashboard>`. End-user billing hub combining
 * `useSubscriptionStatus()` + `usePaymentHistory()`. Without a signed-in
 * user the dashboard surfaces its &quot;No active subscription&quot;
 * empty-state, which is itself a meaningful preview (CTA &quot;Choose a
 * plan&quot; visible).
 */
export default function Demo() {
  return (
    <DemoSandbox componentName="BillingDashboard">
      <Div className="flex flex-col items-center gap-3 w-full">
        <Div className="w-full max-w-3xl">
          <BillingDashboard recentPaymentsCount={3} />
        </Div>
        <P className="text-xs text-muted-foreground text-center max-w-md">
          Wire `onUpgrade` to push to your pricing page, `onViewAllPayments` to your full history
          view, and `manageReturnUrl` to the URL Stripe should send the user back to after the
          Customer Portal session.
        </P>
      </Div>
    </DemoSandbox>
  )
}
