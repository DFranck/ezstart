'use client'

import { ApplicationsList } from '@ezstart/auth-sdk/components'
import { Div } from '@ezstart/ui/components'
import { DemoSandbox } from './_lib/DemoSandbox'

export default function Demo() {
  return (
    <DemoSandbox componentName="ApplicationsList">
      <Div className="w-full">
        <ApplicationsList />
      </Div>
    </DemoSandbox>
  )
}
