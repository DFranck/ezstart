'use client'

import { ApplicationsList } from '@ezstart/auth-sdk/components'
import { Div, P } from '@ezstart/ui/components'
import { DemoSandbox } from './_lib/DemoSandbox'

export default function Demo() {
  return (
    <DemoSandbox componentName="ApplicationsList">
      <Div className="w-full flex flex-col items-center gap-3">
        <ApplicationsList />
        <P className="text-xs text-muted-foreground text-center max-w-xs">
          Owner-scoped grid of Applications fetched via the sandbox AuthProvider. Sign in inside the
          demo to see your own applications; otherwise renders the empty state.
        </P>
      </Div>
    </DemoSandbox>
  )
}
