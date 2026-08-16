'use client'

import { UserMenu } from '@ezstart/auth-sdk/components'
import { Div } from '@ezstart/ui/components'
import { DemoSandbox } from './_lib/DemoSandbox'

export default function Demo() {
  return (
    <DemoSandbox componentName="UserMenu">
      <Div className="flex items-center justify-end w-full">
        <UserMenu />
      </Div>
    </DemoSandbox>
  )
}
