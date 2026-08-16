'use client'

import { TwoFactorSettings } from '@ezstart/auth-sdk/components'
import { Div, P } from '@ezstart/ui/components'
import { DemoSandbox } from './_lib/DemoSandbox'

export default function Demo() {
  return (
    <DemoSandbox componentName="TwoFactorSettings">
      <Div className="w-full max-w-2xl flex flex-col items-center gap-3">
        <TwoFactorSettings />
        <P className="text-xs text-muted-foreground text-center max-w-xs">
          User settings panel for enrolling, viewing, or removing TOTP. Reads the current 2FA status
          from the sandbox session and exposes setup / disable flows.
        </P>
      </Div>
    </DemoSandbox>
  )
}
