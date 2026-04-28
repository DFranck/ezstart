'use client'

import { useState } from 'react'
import { SignUpModal } from '@ezstart/auth-sdk/components'
import { Button, Div } from '@ezstart/ui/components'

export default function Demo() {
  const [open, setOpen] = useState(false)
  return (
    <Div className="flex flex-col items-center gap-3">
      <Button onClick={() => setOpen(true)}>Open SignUpModal</Button>
      <SignUpModal isOpen={open} onClose={() => setOpen(false)} />
    </Div>
  )
}
