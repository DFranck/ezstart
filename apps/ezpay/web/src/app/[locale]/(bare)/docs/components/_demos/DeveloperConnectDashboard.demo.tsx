'use client'

import { DeveloperConnectDashboard } from '@ezstart/pay-sdk/components'
import { Div, P } from '@ezstart/ui/components'
import { DemoSandbox } from './_lib/DemoSandbox'

/**
 * Live preview for `<DeveloperConnectDashboard>`. The component checks the
 * Connect status of the docs sandbox Application via `useConnectStatus()`.
 * In the sandbox no Connect account is provisioned, so the dashboard
 * mounts the `<ConnectOnboardForm>` branch by default — exactly the
 * onboarding-first flow a fresh developer sees in their dashboard.
 */
export default function Demo() {
  return (
    <DemoSandbox componentName="DeveloperConnectDashboard">
      <Div className="flex flex-col items-center gap-3 w-full">
        <Div className="w-full max-w-2xl">
          <DeveloperConnectDashboard applicationId="_pay-docs-demo" />
        </Div>
        <P className="text-xs text-muted-foreground text-center max-w-md">
          Once the Connect account is onboarded, the dashboard auto-swaps the form for the status
          card + (optional) `feeData` summary. Wire `onError`, `onDashboardOpen`, `onDisconnect` to
          react to lifecycle events.
        </P>
      </Div>
    </DemoSandbox>
  )
}
