'use client'

import { DonateCancelPage } from '@ezstart/pay-sdk/components'
import { Div, P } from '@ezstart/ui/components'
import { DemoSandbox } from './_lib/DemoSandbox'

/**
 * Live preview for `<DonateCancelPage>` (deprecated re-export of
 * `<DonateCancelTemplate>`). The template renders a full-page cancel
 * landing — we constrain it inside a bordered container so it stays
 * inline within the showcase grid.
 */
export default function Demo() {
  return (
    <DemoSandbox componentName="DonateCancelPage">
      <Div className="flex flex-col items-center gap-3">
        <Div className="border rounded-lg overflow-hidden w-full max-w-2xl max-h-[480px] overflow-y-auto bg-background">
          <DonateCancelPage tryAgainHref="/" backHomeHref="/" />
        </Div>
        <P className="text-xs text-muted-foreground text-center max-w-xs">
          Drop-in cancel landing for users who abandon the donation flow. Includes &quot;Try
          again&quot; and &quot;Back home&quot; CTAs.
        </P>
      </Div>
    </DemoSandbox>
  )
}
