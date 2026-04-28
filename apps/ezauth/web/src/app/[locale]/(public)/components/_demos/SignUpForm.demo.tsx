'use client'

import { SignUpForm } from '@ezstart/auth-sdk/components'
import { Div } from '@ezstart/ui/components'

export default function Demo() {
  return (
    <Div className="w-full max-w-md">
      <SignUpForm appName="ezauth" showOAuth keyStatus="missing" />
    </Div>
  )
}
