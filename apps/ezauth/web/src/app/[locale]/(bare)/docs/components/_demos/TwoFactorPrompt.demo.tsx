'use client'

import { TwoFactorPrompt } from '@ezstart/auth-sdk/components'
import { Div } from '@ezstart/ui/components'

export default function Demo() {
  return (
    <Div className="w-full max-w-md">
      <TwoFactorPrompt tempToken="demo-2fa-temp-token" onBack={() => {}} />
    </Div>
  )
}
