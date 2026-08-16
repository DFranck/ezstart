'use client'

import { TwoFactorPrompt } from '@ezstart/auth-sdk/components'
import { Div, P } from '@ezstart/ui/components'

export default function Demo() {
  return (
    <Div className="flex flex-col items-center gap-3 w-full max-w-md">
      <TwoFactorPrompt tempToken="demo-2fa-temp-token" onBack={() => {}} />
      <P className="text-xs text-muted-foreground text-center max-w-xs">
        Second-factor TOTP code input shown after a successful password challenge. Submits to
        `/api/auth/2fa/verify` with the temp token; renders without provider context.
      </P>
    </Div>
  )
}
