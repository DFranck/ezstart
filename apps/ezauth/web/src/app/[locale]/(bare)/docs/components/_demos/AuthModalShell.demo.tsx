'use client'

import { useState } from 'react'
import { AuthModalShell } from '@ezstart/auth-sdk/components'
import { Button, Div, P } from '@ezstart/ui/components'
import { DemoSandbox } from './_lib/DemoSandbox'

export default function Demo() {
  const [open, setOpen] = useState(false)
  return (
    <DemoSandbox componentName="AuthModalShell">
      <Div className="flex flex-col items-center gap-3">
        <Button onClick={() => setOpen(true)}>Open AuthModalShell</Button>
        <AuthModalShell
          isOpen={open}
          onClose={() => setOpen(false)}
          title="Custom auth flow"
          subtitle="Build your own auth UI with the shell as a base"
          footer={
            <P className="text-xs text-muted-foreground">Footer slot — cross-link links go here</P>
          }
        >
          <P className="text-sm">Modal body slot — render your form here.</P>
        </AuthModalShell>
      </Div>
    </DemoSandbox>
  )
}
