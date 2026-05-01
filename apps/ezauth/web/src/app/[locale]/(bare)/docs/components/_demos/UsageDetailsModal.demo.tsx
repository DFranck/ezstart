'use client'

import { useState } from 'react'
import { UsageDetailsModal, defaultDeveloperPortalTexts } from '@ezstart/auth-sdk/components'
import { Button, Div } from '@ezstart/ui/components'
import { DemoSandbox } from './_lib/DemoSandbox'

export default function Demo() {
  const [open, setOpen] = useState(false)
  return (
    <DemoSandbox componentName="UsageDetailsModal">
      <Div className="flex flex-col items-center gap-3">
        <Button onClick={() => setOpen(true)}>Open UsageDetailsModal</Button>
        <UsageDetailsModal
          isOpen={open}
          onClose={() => setOpen(false)}
          keyId="demo-key-id"
          keyName="My Demo Key"
          texts={defaultDeveloperPortalTexts.usage}
        />
      </Div>
    </DemoSandbox>
  )
}
