'use client'

import { SubscriptionCard } from '@ezstart/pay-sdk/components'
import { Div, P } from '@ezstart/ui/components'
import { DemoSandbox } from './_lib/DemoSandbox'

/**
 * Live preview for `<SubscriptionCard>`. Compact card surfacing an
 * active subscription (plan name, price, status badge, cancel CTA).
 * Mock subscription data is passed via the `subscription` prop — no
 * network call is made on render. Cancel triggers a confirm dialog;
 * the cancel call would hit the sandbox API in a real flow.
 */
export default function Demo() {
  const mockSubscription = {
    id: 'sub_demo_pro_monthly',
    projectId: '_pay-docs-demo',
    planName: 'Pro',
    amount: 9.99,
    currency: 'EUR',
    interval: 'month',
    intervalCount: 1,
    status: 'completed',
    metadata: { subscriptionId: 'sub_demo_pro_monthly' },
  }

  return (
    <DemoSandbox componentName="SubscriptionCard">
      <Div className="flex flex-col items-center gap-3">
        <Div className="w-full max-w-sm">
          <SubscriptionCard subscription={mockSubscription} />
        </Div>
        <P className="text-xs text-muted-foreground text-center max-w-xs">
          Plan name, renewal price, status badge, and an inline cancel CTA guarded by a
          `&lt;ConfirmActionDialog&gt;`. Pass `onCancel` to override the default API call.
        </P>
      </Div>
    </DemoSandbox>
  )
}
