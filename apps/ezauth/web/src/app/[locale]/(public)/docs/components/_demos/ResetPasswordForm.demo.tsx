'use client'

import { ResetPasswordForm } from '@ezstart/auth-sdk/components'
import { Div } from '@ezstart/ui/components'

export default function Demo() {
  // Showcase mode: pass a fake token. The form renders fully but submission
  // will hit the API and (correctly) fail — the visual state is the demo.
  return (
    <Div className="w-full max-w-md">
      <ResetPasswordForm token="demo-reset-token" />
    </Div>
  )
}
