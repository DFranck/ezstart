'use client'

import { VerifyEmailFlow } from '@ezstart/auth-sdk/components'
import { Div } from '@ezstart/ui/components'
import { DemoSandbox } from './_lib/DemoSandbox'

export default function Demo() {
  return (
    <DemoSandbox componentName="VerifyEmailFlow">
      <Div className="w-full max-w-md">
        <VerifyEmailFlow token="demo-verify-token" />
      </Div>
    </DemoSandbox>
  )
}
