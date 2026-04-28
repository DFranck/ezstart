'use client'

import { SignInForm } from '@ezstart/auth-sdk/components'
import { Div } from '@ezstart/ui/components'

export default function Demo() {
  return (
    <Div className="w-full max-w-md">
      <SignInForm appName="ezauth" showOAuth keyStatus="missing" />
    </Div>
  )
}
