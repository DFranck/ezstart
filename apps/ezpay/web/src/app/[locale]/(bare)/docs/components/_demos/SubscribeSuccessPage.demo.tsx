'use client'

import { SubscribeSuccessPage } from '@ezstart/pay-sdk/components'
import { Div, P } from '@ezstart/ui/components'
import { DemoSandbox } from './_lib/DemoSandbox'

/**
 * Live preview for `<SubscribeSuccessPage>` (deprecated re-export of
 * `<SubscribeSuccessTemplate>`). Full-page subscription success landing —
 * we constrain it inside a bordered container so it stays inline within
 * the showcase grid.
 */
export default function Demo() {
  return (
    <DemoSandbox componentName="SubscribeSuccessPage">
      <Div className="flex flex-col items-center gap-3">
        <Div className="border rounded-lg overflow-hidden w-full max-w-2xl max-h-[480px] overflow-y-auto bg-background">
          <SubscribeSuccessPage redirectDelayMs={0} redirectTo="/" />
        </Div>
        <P className="text-xs text-muted-foreground text-center max-w-xs">
          Renders plan summary, next renewal date, and onboarding CTAs (link to dashboard, etc.).
          Override copy via `texts`.
        </P>
      </Div>
    </DemoSandbox>
  )
}
