'use client'

import { SignInForm } from '@ezstart/auth-sdk/components'
import { Div } from '@ezstart/ui/components'
import { DemoSandbox } from './_lib/DemoSandbox'

export default function Demo() {
  return (
    <DemoSandbox componentName="SignInForm">
      <Div className="w-full max-w-md">
        <SignInForm appName="_docs-demo" showOAuth keyStatus="missing" />
      </Div>
    </DemoSandbox>
  )
}
