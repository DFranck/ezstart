'use client'

import { PurchaseCard } from '@ezstart/pay-sdk/components'
import { Div, P } from '@ezstart/ui/components'
import { DemoSandbox } from './_lib/DemoSandbox'

/**
 * Live preview for `<PurchaseCard>`. Marketing-style card showing one
 * product (name, price, description, optional image) with an embedded
 * purchase CTA. Submit launches Stripe Checkout via the sandbox
 * `<PayProvider>`.
 */
export default function Demo() {
  return (
    <DemoSandbox componentName="PurchaseCard">
      <Div className="flex flex-col items-center gap-3">
        <Div className="w-full max-w-sm">
          <PurchaseCard
            productId="prod_demo_ebook"
            productName="EZStart Handbook"
            amount={19.0}
            currency="EUR"
            description="120-page guide to shipping a SaaS in 30 days. Instant PDF download."
            variant="featured"
          />
        </Div>
        <P className="text-xs text-muted-foreground text-center max-w-xs">
          Pass `image` for a hero, `variant=&quot;compact&quot;` for an inline row, or
          `variant=&quot;featured&quot;` to highlight as the primary product.
        </P>
      </Div>
    </DemoSandbox>
  )
}
