'use client'

import { UserDashboard } from '@ezstart/auth-sdk/components'
import { Div, P } from '@ezstart/ui/components'
import { DemoSandbox } from './_lib/DemoSandbox'

export default function Demo() {
  return (
    <DemoSandbox componentName="UserDashboard">
      <Div className="w-full flex flex-col items-center gap-3">
        <UserDashboard appName="_docs-demo" />
        <P className="text-xs text-muted-foreground text-center max-w-xs">
          End-user dashboard — profile, sessions, security, applications. Fetches the current
          session from the sandbox AuthProvider; sign in inside the demo to see populated tabs.
        </P>
      </Div>
    </DemoSandbox>
  )
}
