'use client'

import { DeveloperPortal } from '@ezstart/auth-sdk/components'
import { Div, P } from '@ezstart/ui/components'
import { DemoSandbox } from './_lib/DemoSandbox'

export default function Demo() {
  return (
    <DemoSandbox componentName="DeveloperPortal">
      <Div className="w-full flex flex-col items-center gap-3">
        <DeveloperPortal />
        <P className="text-xs text-muted-foreground text-center max-w-xs">
          Full developer portal — list keys, create new key, rotate, revoke, view usage. Wraps the
          ApiKeysTable, CreateKeyModal, KeyCreatedModal, and UsageDetailsModal components.
        </P>
      </Div>
    </DemoSandbox>
  )
}
