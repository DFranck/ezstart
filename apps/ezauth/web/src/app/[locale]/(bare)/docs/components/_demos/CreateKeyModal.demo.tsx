'use client'

import { useState } from 'react'
import { CreateKeyModal, defaultDeveloperPortalTexts } from '@ezstart/auth-sdk/components'
import { Button, Div } from '@ezstart/ui/components'
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
      </Div>
    </DemoSandbox>
  )
}
