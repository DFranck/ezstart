'use client'

import { AuditLogSection } from '@ezstart/auth-sdk/components'
import { Div } from '@ezstart/ui/components'
import { DemoSandbox } from './_lib/DemoSandbox'

export default function Demo() {
  return (
    <DemoSandbox componentName="AuditLogSection">
      <Div className="w-full max-w-2xl">
        <AuditLogSection />
      </Div>
    </DemoSandbox>
  )
}
