'use client'

import { DeleteAccountSection } from '@ezstart/auth-sdk/components'
import { Div } from '@ezstart/ui/components'
import { DemoSandbox } from './_lib/DemoSandbox'

export default function Demo() {
  return (
    <DemoSandbox componentName="DeleteAccountSection">
      <Div className="w-full max-w-2xl">
        <DeleteAccountSection />
      </Div>
    </DemoSandbox>
  )
}
