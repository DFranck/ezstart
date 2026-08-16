'use client'

import { DonateSuccessPage } from '@ezstart/pay-sdk/components'
import { Div, P } from '@ezstart/ui/components'
import { DemoSandbox } from './_lib/DemoSandbox'

/**
 * Live preview for `<DonateSuccessPage>` (deprecated re-export of
 * `<DonateSuccessTemplate>`). The template renders a full-page success
 * landing — we constrain it inside a bordered container so it stays
 * inline within the showcase grid. Pass `redirectDelayMs={0}` to disable
 * auto-redirect during the preview.
 */
export default function Demo() {
  return (
    <DemoSandbox componentName="DonateSuccessPage">
      <Div className="flex flex-col items-center gap-3">
        <Div className="border rounded-lg overflow-hidden w-full max-w-2xl max-h-[480px] overflow-y-auto bg-background">
          <DonateSuccessPage redirectDelayMs={0} redirectTo="/" />
        </Div>
        <P className="text-xs text-muted-foreground text-center max-w-xs">
          Drop-in success landing for Stripe Checkout donation redirects. Override copy via `texts`,
          configure auto-redirect via `redirectDelayMs`.
        </P>
      </Div>
    </DemoSandbox>
  )
}
