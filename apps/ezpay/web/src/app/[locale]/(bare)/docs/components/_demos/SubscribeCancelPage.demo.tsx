'use client'

import { SubscribeCancelPage } from '@ezstart/pay-sdk/components'
import { Div, P } from '@ezstart/ui/components'
import { DemoSandbox } from './_lib/DemoSandbox'

/**
 * Live preview for `<SubscribeCancelPage>` (deprecated re-export of
 * `<SubscribeCancelTemplate>`). The template renders a full-page cancel
 * landing — we constrain it inside a bordered container so it stays
 * inline within the showcase grid.
 */
export default function Demo() {
  return (
    <DemoSandbox componentName="SubscribeCancelPage">
      <Div className="flex flex-col items-center gap-3">
        <Div className="border rounded-lg overflow-hidden w-full max-w-2xl max-h-[480px] overflow-y-auto bg-background">
          <SubscribeCancelPage backToPricingHref="/" backHomeHref="/" />
        </Div>
        <P className="text-xs text-muted-foreground text-center max-w-xs">
          Subscription cancel landing — explains nothing was charged, includes &quot;Choose another
          plan&quot; and &quot;Back home&quot; CTAs.
        </P>
      </Div>
    </DemoSandbox>
  )
}
