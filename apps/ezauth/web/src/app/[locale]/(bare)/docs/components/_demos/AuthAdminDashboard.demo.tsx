'use client'

import { AuthAdminDashboard } from '@ezstart/auth-sdk/components'
import { Div, P } from '@ezstart/ui/components'
import { DemoSandbox } from './_lib/DemoSandbox'

export default function Demo() {
  return (
    <DemoSandbox componentName="AuthAdminDashboard">
      <Div className="w-full flex flex-col items-center gap-3">
        <AuthAdminDashboard />
        <P className="text-xs text-muted-foreground text-center max-w-xs">
          Federated superadmin dashboard — users, applications, audit log, maintenance toggle.
          Requires a superadmin session; otherwise renders the access-denied state.
        </P>
      </Div>
    </DemoSandbox>
  )
}
