'use client'

import { QuickSignUpForm } from '@ezstart/auth-sdk/components'
import { Div } from '@ezstart/ui/components'
import { DemoSandbox } from './_lib/DemoSandbox'

export default function Demo() {
  return (
    <DemoSandbox componentName="QuickSignUpForm">
      <Div className="w-full max-w-md">
        <QuickSignUpForm appName="_docs-demo" />
      </Div>
    </DemoSandbox>
  )
}
