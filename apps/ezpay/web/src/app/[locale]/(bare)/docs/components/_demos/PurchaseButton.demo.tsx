'use client'

import { PurchaseButton } from '@ezstart/pay-sdk/components'
import { Div, P } from '@ezstart/ui/components'
import { DemoSandbox } from './_lib/DemoSandbox'

/**
 * Live preview for `<PurchaseButton>`. One-shot purchase CTA that opens
 * a confirmation modal then launches Stripe Checkout for a single line
 * item via the sandbox `<PayProvider>`.
 */
export default function Demo() {
  return (
    <DemoSandbox componentName="PurchaseButton">
      <Div className="flex flex-col items-center gap-3">
        <PurchaseButton
          projectId="_pay-docs-demo"
          productId="prod_demo_ebook"
          productName="EZStart Handbook"
          amount={19.0}
          currency="EUR"
          description="Digital ebook — instant download after checkout."
        />
        <P className="text-xs text-muted-foreground text-center max-w-xs">
          Click to open the purchase confirmation modal. Submit redirects to a sandbox Stripe
          Checkout session — safe to test, isolated from your main account.
        </P>
      </Div>
    </DemoSandbox>
  )
}
