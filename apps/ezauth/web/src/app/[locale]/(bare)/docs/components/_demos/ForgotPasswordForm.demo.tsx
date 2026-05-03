'use client'

import { ForgotPasswordForm } from '@ezstart/auth-sdk/components'
import { Div } from '@ezstart/ui/components'
import { DemoSandbox } from './_lib/DemoSandbox'

export default function Demo() {
  return (
    <DemoSandbox componentName="ForgotPasswordForm">
      <Div className="w-full max-w-md">
        <ForgotPasswordForm />
      </Div>
    </DemoSandbox>
  )
}
