'use client'

import { UserSettings } from '@ezstart/auth-sdk/components'
import { Div } from '@ezstart/ui/components'
import { DemoSandbox } from './_lib/DemoSandbox'

export default function Demo() {
  return (
    <DemoSandbox componentName="UserSettings">
      <Div className="w-full max-w-2xl">
        <UserSettings appName="_docs-demo" />
      </Div>
    </DemoSandbox>
  )
}
