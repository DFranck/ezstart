'use client'

import { DeveloperPortal } from '@ezstart/auth-sdk/components'
import { Div } from '@ezstart/ui/components'
import { DemoSandbox } from './_lib/DemoSandbox'

export default function Demo() {
  return (
    <DemoSandbox componentName="DeveloperPortal">
      <Div className="w-full">
        <DeveloperPortal />
      </Div>
    </DemoSandbox>
  )
}
