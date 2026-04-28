'use client'

import { useState } from 'react'
import { CreateApplicationModal } from '@ezstart/auth-sdk/components'
import { Button, Div } from '@ezstart/ui/components'

export default function Demo() {
  const [open, setOpen] = useState(false)
  return (
    <Div className="flex flex-col items-center gap-3">
      <Button onClick={() => setOpen(true)}>Open CreateApplicationModal</Button>
      <CreateApplicationModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onCreated={() => setOpen(false)}
      />
    </Div>
  )
}
