'use client'

import { EZAuthDashboard } from '@ezstart/auth-sdk/components'
import { Div, P } from '@ezstart/ui/components'
import { DemoSandbox } from './_lib/DemoSandbox'

export default function Demo() {
  return (
    <DemoSandbox componentName="EZAuthDashboard">
      <Div className="w-full flex flex-col items-center gap-3">
        <EZAuthDashboard appName="_docs-demo" />
        <P className="text-xs text-muted-foreground text-center max-w-xs">
          Federated EZAuth dashboard shell — switches between user / superadmin views based on the
          session role. Composed of nested sections from the auth-sdk.
        </P>
      </Div>
    </DemoSandbox>
  )
}
