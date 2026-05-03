'use client'

import { useState } from 'react'
import { CreateApplicationModal } from '@ezstart/auth-sdk/components'
import { Button, Div, P } from '@ezstart/ui/components'
import { DemoSandbox } from './_lib/DemoSandbox'

export default function Demo() {
  const [open, setOpen] = useState(false)
  return (
    <DemoSandbox componentName="CreateApplicationModal">
      <Div className="flex flex-col items-center gap-3">
        <Button onClick={() => setOpen(true)}>Open CreateApplicationModal</Button>
        <CreateApplicationModal
          isOpen={open}
          onClose={() => setOpen(false)}
          onCreated={() => setOpen(false)}
        />
        <P className="text-xs text-muted-foreground text-center max-w-xs">
          Modal form to create a new Application (name, slug, description). On success, calls
          `onCreated`. Requires an authenticated session inside the sandbox.
        </P>
      </Div>
    </DemoSandbox>
  )
}
