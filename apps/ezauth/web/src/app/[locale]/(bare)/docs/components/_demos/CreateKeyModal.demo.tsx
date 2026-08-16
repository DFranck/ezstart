'use client'

import { useState } from 'react'
import { CreateKeyModal, defaultDeveloperPortalTexts } from '@ezstart/auth-sdk/components'
import { Button, Div, P } from '@ezstart/ui/components'
import { DemoSandbox } from './_lib/DemoSandbox'

export default function Demo() {
  const [open, setOpen] = useState(false)
  return (
    <DemoSandbox componentName="CreateKeyModal">
      <Div className="flex flex-col items-center gap-3">
        <Button onClick={() => setOpen(true)}>Open CreateKeyModal</Button>
        <CreateKeyModal
          isOpen={open}
          onClose={() => setOpen(false)}
          onSubmit={() => setOpen(false)}
          isSubmitting={false}
          texts={defaultDeveloperPortalTexts.create}
        />
        <P className="text-xs text-muted-foreground text-center max-w-xs">
          Modal form to create a new API key (name, scope, env). The parent owns submit handling and
          `KeyCreatedModal` is shown next with the raw key.
        </P>
      </Div>
    </DemoSandbox>
  )
}
