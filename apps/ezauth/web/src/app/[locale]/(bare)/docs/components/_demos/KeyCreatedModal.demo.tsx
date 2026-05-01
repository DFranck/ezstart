'use client'

import { useState } from 'react'
import { KeyCreatedModal, defaultDeveloperPortalTexts } from '@ezstart/auth-sdk/components'
import { Button, Div } from '@ezstart/ui/components'

export default function Demo() {
  const [open, setOpen] = useState(false)
  return (
    <Div className="flex flex-col items-center gap-3">
      <Button onClick={() => setOpen(true)}>Open KeyCreatedModal</Button>
      <KeyCreatedModal
        isOpen={open}
        onClose={() => setOpen(false)}
        rawKey="ez_pk_test_abcd1234example5678demo"
        texts={defaultDeveloperPortalTexts.created}
      />
    </Div>
  )
}
