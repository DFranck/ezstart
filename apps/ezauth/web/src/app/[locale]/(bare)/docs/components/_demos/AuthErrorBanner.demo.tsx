'use client'

import { AuthErrorBanner } from '@ezstart/auth-sdk/components'
import { Div } from '@ezstart/ui/components'
import { DemoSandbox } from './_lib/DemoSandbox'

export default function Demo() {
  return (
    <DemoSandbox componentName="AuthErrorBanner">
      <Div className="w-full max-w-md space-y-3">
        <AuthErrorBanner>Wrong email or password.</AuthErrorBanner>
        <AuthErrorBanner>Too many attempts. Try again in a minute.</AuthErrorBanner>
      </Div>
    </DemoSandbox>
  )
}
