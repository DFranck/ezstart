'use client'

import { PlansManager } from '@ezstart/pay-sdk/components'
import { Div, P } from '@ezstart/ui/components'
import { DemoSandbox } from './_lib/DemoSandbox'

/**
 * Live preview for `<PlansManager>`. Calls `PayClient.listPlans()` for both
 * active and archived plans on the docs sandbox Application. If the seed
 * has provisioned plans, devs see the table populated; otherwise the
 * empty-state surfaces alongside the &quot;Create plan&quot; CTA.
 */
export default function Demo() {
  return (
    <DemoSandbox componentName="PlansManager">
      <Div className="flex flex-col items-center gap-3 w-full">
        <Div className="w-full max-w-3xl">
          <PlansManager applicationId="_pay-docs-demo" />
        </Div>
        <P className="text-xs text-muted-foreground text-center max-w-md">
          Drives `PlanEditorDialog` for create + edit, and `PlanArchiveDialog` for safe archival.
          Mirrors the auth-sdk admin patterns — no app-specific UI required.
        </P>
      </Div>
    </DemoSandbox>
  )
}
