'use client'

import { PurchaseSuccessPage } from '@ezstart/pay-sdk/components'
import { Div, P } from '@ezstart/ui/components'
import { DemoSandbox } from './_lib/DemoSandbox'

/**
 * Live preview for `<PurchaseSuccessPage>` (deprecated re-export of
 * `<PurchaseSuccessTemplate>`). Full-page purchase success landing —
 * we constrain it inside a bordered container so it stays inline within
 * the showcase grid.
 */
export default function Demo() {
  return (
    <DemoSandbox componentName="PurchaseSuccessPage">
      <Div className="flex flex-col items-center gap-3">
        <Div className="border rounded-lg overflow-hidden w-full max-w-2xl max-h-[480px] overflow-y-auto bg-background">
          <PurchaseSuccessPage redirectDelayMs={0} redirectTo="/" />
        </Div>
        <P className="text-xs text-muted-foreground text-center max-w-xs">
          Order summary, optional download link or shipping ETA, and a &quot;Back to shop&quot; CTA.
          Override copy via `texts`.
        </P>
      </Div>
    </DemoSandbox>
  )
}
