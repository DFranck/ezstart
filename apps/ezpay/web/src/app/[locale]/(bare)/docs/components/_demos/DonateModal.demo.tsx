'use client'

import { DonateModal } from '@ezstart/pay-sdk/components'
import { Div, P } from '@ezstart/ui/components'
import { DemoSandbox } from './_lib/DemoSandbox'

/**
 * Live preview for `<DonateModal>`. The component renders its own trigger
 * button — clicking it opens a modal with amount picker, optional message,
 * anonymous toggle, and a submit that creates a donation via the sandbox
 * `<PayProvider>`. Submit redirects to a real Stripe Checkout (sandbox key
 * isolates impact from the visitor's main session).
 */
export default function Demo() {
  return (
    <DemoSandbox componentName="DonateModal">
      <Div className="flex flex-col items-center gap-3">
        <DonateModal
          projectId="_pay-docs-demo"
          projectName="Docs sandbox"
          amounts={[5, 10, 25]}
          currency="EUR"
        />
        <P className="text-xs text-muted-foreground text-center max-w-xs">
          Click the button to open the donation modal. The submit hits the sandbox Stripe key — safe
          to test, isolated from your main account.
        </P>
      </Div>
    </DemoSandbox>
  )
}
