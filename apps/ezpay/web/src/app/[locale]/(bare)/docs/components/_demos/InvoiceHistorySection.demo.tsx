'use client'

import { InvoiceHistorySection } from '@ezstart/pay-sdk/components'
import { Div, P } from '@ezstart/ui/components'
import { DemoSandbox } from './_lib/DemoSandbox'

/**
 * Live preview for `<InvoiceHistorySection>`. Calls `usePaymentHistory()`
 * scoped to the docs sandbox Application — without a signed-in user the
 * server returns an empty list, which surfaces the empty-state UI (still a
 * meaningful preview: filters + table chrome are visible).
 */
export default function Demo() {
  return (
    <DemoSandbox componentName="InvoiceHistorySection">
      <Div className="flex flex-col items-center gap-3 w-full">
        <InvoiceHistorySection applicationId="_pay-docs-demo" pageSize={5} />
        <P className="text-xs text-muted-foreground text-center max-w-md">
          Pass `userId` to scope the table to a specific customer. `pageSize` controls the row count
          per page (default 10).
        </P>
      </Div>
    </DemoSandbox>
  )
}
