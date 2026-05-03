'use client'

import { SignUpForm } from '@ezstart/auth-sdk/components'
import { Div } from '@ezstart/ui/components'
import { DemoSandbox } from './_lib/DemoSandbox'

export default function Demo() {
  return (
    <DemoSandbox componentName="SignUpForm">
      <Div className="w-full max-w-md">
        <SignUpForm appName="_docs-demo" showOAuth keyStatus="missing" />
      </Div>
    </DemoSandbox>
  )
}
