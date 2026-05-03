'use client'

import { DonateButton } from '@ezstart/pay-sdk/components'
import { Div, P } from '@ezstart/ui/components'
import { DemoSandbox } from './_lib/DemoSandbox'

/**
 * Live preview for `<DonateButton>`. The component is a thin Button wrapper
 * — it has no Stripe call by itself, the consumer wires `onClick` to launch
 * Checkout. Rendering it inside `<DemoSandbox>` keeps the preview consistent
 * with the rest of the showcase (sandbox PayProvider context, isolated from
 * the visitor's main session) and surfaces the real component visual.
 */
export default function Demo() {
  return (
    <DemoSandbox componentName="DonateButton">
      <Div className="flex flex-col items-center gap-3">
        <DonateButton onClick={() => undefined} />
        <P className="text-xs text-muted-foreground text-center max-w-xs">
          Default styling. Pass `children` to override the label, `variant` to switch styles, and
          wire `onClick` to your Stripe Checkout session creator.
        </P>
      </Div>
    </DemoSandbox>
  )
}
