'use client'

import { PayNotConfiguredCard } from '@ezstart/pay-sdk/components'
import { Div, P } from '@ezstart/ui/components'
import { DemoSandbox } from './_lib/DemoSandbox'

/**
 * Live preview for `<PayNotConfiguredCard>`. Pure visual — no provider call,
 * no fetch, just the fallback every pay-sdk component degrades to when its
 * `applicationId` cannot be resolved or `/keys/config` returns 4xx/5xx.
 */
export default function Demo() {
  return (
    <DemoSandbox componentName="PayNotConfiguredCard">
      <Div className="flex flex-col items-center gap-3">
        <PayNotConfiguredCard
          reason="missing-key"
          dashboardUrl="https://ezpay.ezstart.xyz/en/developer"
        />
        <P className="text-xs text-muted-foreground text-center max-w-md">
          Switch `reason` between `missing-key`, `resolve-failed`, `fetch-failed` and `invalid-key`
          to render the matching icon + copy. Pass `variant=&quot;compact&quot;` for an inline
          banner.
        </P>
      </Div>
    </DemoSandbox>
  )
}
