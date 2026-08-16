'use client'

import { PurchaseCancelPage } from '@ezstart/pay-sdk/components'
import { Div, P } from '@ezstart/ui/components'
import { DemoSandbox } from './_lib/DemoSandbox'

/**
 * Live preview for `<PurchaseCancelPage>` (deprecated re-export of
 * `<PurchaseCancelTemplate>`). Full-page purchase cancel landing — we
 * constrain it inside a bordered container so it stays inline within
 * the showcase grid.
 */
export default function Demo() {
  return (
    <DemoSandbox componentName="PurchaseCancelPage">
      <Div className="flex flex-col items-center gap-3">
        <Div className="border rounded-lg overflow-hidden w-full max-w-2xl max-h-[480px] overflow-y-auto bg-background">
          <PurchaseCancelPage tryAgainHref="/" backHomeHref="/" />
        </Div>
        <P className="text-xs text-muted-foreground text-center max-w-xs">
          Friendly recovery message + &quot;View product&quot; / &quot;Back home&quot; CTAs.
          Override copy via `texts`.
        </P>
      </Div>
    </DemoSandbox>
  )
}
