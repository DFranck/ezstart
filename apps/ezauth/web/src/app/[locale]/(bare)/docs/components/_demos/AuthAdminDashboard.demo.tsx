'use client'

import { AuthAdminDashboard } from '@ezstart/auth-sdk/components'
import { Div } from '@ezstart/ui/components'
import { DemoSandbox } from './_lib/DemoSandbox'

export default function Demo() {
  return (
    <DemoSandbox componentName="AuthAdminDashboard">
      <Div className="w-full">
        <AuthAdminDashboard />
      </Div>
    </DemoSandbox>
  )
}
