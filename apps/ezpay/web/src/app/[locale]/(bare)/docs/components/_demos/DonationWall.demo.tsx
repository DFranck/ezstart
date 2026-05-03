'use client'

import { DonationWall } from '@ezstart/pay-sdk/components'
import { Div, P } from '@ezstart/ui/components'
import { DemoSandbox } from './_lib/DemoSandbox'

/**
 * Live preview for `<DonationWall>`. Public donor wall fetching recent
 * donations via `GET /api/donations` (sandbox-scoped). The wall renders
 * an empty state when no donations exist yet — donate via the sandbox
 * to populate it.
 */
export default function Demo() {
  return (
    <DemoSandbox componentName="DonationWall">
      <Div className="flex flex-col gap-3 w-full">
        <DonationWall projectId="_pay-docs-demo" limit={20} />
        <P className="text-xs text-muted-foreground text-center max-w-xs mx-auto">
          Powered by `useDonations`. Auto-degrades to a friendly empty state when no donations exist
          or to a `&lt;PayNotConfiguredCard&gt;` if the API is unreachable.
        </P>
      </Div>
    </DemoSandbox>
  )
}
