'use client'

import { ConnectFeeSummary } from '@ezstart/pay-sdk/components'
import { Div, P } from '@ezstart/ui/components'
import { DemoSandbox } from './_lib/DemoSandbox'

/**
 * Live preview for `<ConnectFeeSummary>`. Pure visual — receives all values
 * via props (no fetch), so we feed plausible Connect aggregate stats to
 * showcase the 3-tile layout (total fees, average %, transaction count).
 */
export default function Demo() {
  return (
    <DemoSandbox componentName="ConnectFeeSummary">
      <Div className="flex flex-col items-center gap-3 w-full">
        <ConnectFeeSummary totalFees={342.18} averageFeePercent={2.9} transactionCount={142} />
        <P className="text-xs text-muted-foreground text-center max-w-md">
          Render this above your payouts table to give Connect-enabled developers an instant read on
          the fees their app paid this month.
        </P>
      </Div>
    </DemoSandbox>
  )
}
