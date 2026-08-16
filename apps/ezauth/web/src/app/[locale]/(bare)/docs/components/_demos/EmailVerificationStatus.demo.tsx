'use client'

import { EmailVerificationStatus } from '@ezstart/auth-sdk/components'
import { Div } from '@ezstart/ui/components'
import { DemoSandbox } from './_lib/DemoSandbox'

export default function Demo() {
  return (
    <DemoSandbox componentName="EmailVerificationStatus">
      <Div className="w-full max-w-md">
        <EmailVerificationStatus />
      </Div>
    </DemoSandbox>
  )
}
