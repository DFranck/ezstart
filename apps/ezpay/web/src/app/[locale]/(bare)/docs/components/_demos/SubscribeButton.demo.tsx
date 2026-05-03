'use client'

import { SubscribeButton } from '@ezstart/pay-sdk/components'
import { Div, P } from '@ezstart/ui/components'
import { DemoSandbox } from './_lib/DemoSandbox'

/**
 * Live preview for `<SubscribeButton>`. Renders a CTA that opens a modal
 * with a plan summary, optional promo code input, and a submit that
 * launches Stripe Checkout for the recurring plan via the sandbox
 * `<PayProvider>`.
 */
export default function Demo() {
  return (
    <DemoSandbox componentName="SubscribeButton">
      <Div className="flex flex-col items-center gap-3">
        <SubscribeButton
          projectId="_pay-docs-demo"
          priceId="price_demo_pro_monthly"
          planName="Pro"
          amount={9.99}
          currency="EUR"
          intervalCount={1}
          description="Pro plan — billed monthly. Cancel anytime."
        />
        <P className="text-xs text-muted-foreground text-center max-w-xs">
          Click the button to open the subscription modal. Pass `trialDays` to surface a free trial
          disclosure, or `showPromoInput` to expose an inline promo code field.
        </P>
      </Div>
    </DemoSandbox>
  )
}
