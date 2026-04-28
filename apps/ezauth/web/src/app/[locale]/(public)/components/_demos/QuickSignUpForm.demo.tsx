'use client'

import { QuickSignUpForm } from '@ezstart/auth-sdk/components'
import { Div } from '@ezstart/ui/components'

export default function Demo() {
  return (
    <Div className="w-full max-w-md">
      <QuickSignUpForm appName="ezauth" />
    </Div>
  )
}
