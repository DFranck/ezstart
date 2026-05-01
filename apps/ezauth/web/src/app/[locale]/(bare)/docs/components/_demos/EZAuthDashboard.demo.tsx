'use client'

import { EZAuthDashboard } from '@ezstart/auth-sdk/components'
import { Div } from '@ezstart/ui/components'
import { DemoSandbox } from './_lib/DemoSandbox'

export default function Demo() {
  return (
    <DemoSandbox componentName="EZAuthDashboard">
      <Div className="w-full">
        <EZAuthDashboard appName="_docs-demo" />
      </Div>
    </DemoSandbox>
  )
}
