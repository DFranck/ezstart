'use client'

import { UserMenuV2 } from '@ezstart/auth-sdk/components'
import { Div } from '@ezstart/ui/components'
import { DemoSandbox } from './_lib/DemoSandbox'

export default function Demo() {
  return (
    <DemoSandbox componentName="UserMenuV2">
      <Div className="flex items-center justify-end w-full">
        <UserMenuV2 />
      </Div>
    </DemoSandbox>
  )
}
