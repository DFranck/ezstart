'use client'

import { UserDashboard } from '@ezstart/auth-sdk/components'
import { Div } from '@ezstart/ui/components'
import { DemoSandbox } from './_lib/DemoSandbox'

export default function Demo() {
  return (
    <DemoSandbox componentName="UserDashboard">
      <Div className="w-full">
        <UserDashboard appName="_docs-demo" />
      </Div>
    </DemoSandbox>
  )
}
