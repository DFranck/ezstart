'use client'

import { DonationCard } from '@ezstart/pay-sdk/components'
import { Div, P } from '@ezstart/ui/components'
import { DemoSandbox } from './_lib/DemoSandbox'

/**
 * Live preview for `<DonationCard>`. Self-contained card with a project
 * pitch, suggested amounts, optional message field, and an embedded submit
 * that hits the sandbox `<PayProvider>` to create a Stripe Checkout session.
 */
export default function Demo() {
  return (
    <DemoSandbox componentName="DonationCard">
      <Div className="flex flex-col items-center gap-3">
        <DonationCard
          projectId="_pay-docs-demo"
          projectName="Docs sandbox"
          presetAmounts={[5, 10, 25, 50]}
          currency="EUR"
          allowCustomAmount
        />
        <P className="text-xs text-muted-foreground text-center max-w-xs">
          Drop on landing pages or sidebars. Pass `variant=&quot;featured&quot;` to highlight,
          `variant=&quot;compact&quot;` for an inline pill row.
        </P>
      </Div>
    </DemoSandbox>
  )
}
