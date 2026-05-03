'use client'

import { RefundButton } from '@ezstart/pay-sdk/components'
import { Div, P } from '@ezstart/ui/components'
import { DemoSandbox } from './_lib/DemoSandbox'

/**
 * Live preview for `<RefundButton>`. Renders the trigger button — clicking it
 * opens the built-in confirm dialog. We pass an `onRefund` override that
 * resolves a fake 800ms promise so devs see the dialog flow without an API
 * call (and without surfacing a real refund attempt against the sandbox
 * payment).
 */
export default function Demo() {
  return (
    <DemoSandbox componentName="RefundButton">
      <Div className="flex flex-col items-center gap-3">
        <RefundButton
          paymentId="demo_payment_001"
          amount={2999}
          currency="EUR"
          onRefund={async () => {
            await new Promise(resolve => setTimeout(resolve, 800))
          }}
        />
        <P className="text-xs text-muted-foreground text-center max-w-md">
          Pass `amount` to render the formatted amount in the confirm copy. Omit `onRefund` to let
          the SDK call `POST /api/payments/:id/refund` directly via the PayProvider client.
        </P>
      </Div>
    </DemoSandbox>
  )
}
