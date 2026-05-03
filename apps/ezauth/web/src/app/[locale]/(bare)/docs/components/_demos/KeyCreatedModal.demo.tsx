'use client'

import { useState } from 'react'
import { KeyCreatedModal, defaultDeveloperPortalTexts } from '@ezstart/auth-sdk/components'
import { Button, Div, P } from '@ezstart/ui/components'

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
      <P className="text-xs text-muted-foreground text-center max-w-xs">
        Shown once after a key is created — exposes the raw key value for copy. The visitor will not
        be able to see the key again, so the modal forces an explicit dismissal.
      </P>
    </Div>
  )
}
