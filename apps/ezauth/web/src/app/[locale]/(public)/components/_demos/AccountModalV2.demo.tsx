'use client'

import { useState } from 'react'
import { AccountModalV2 } from '@ezstart/auth-sdk/components'
import { Button, Div } from '@ezstart/ui/components'

export default function Demo() {
  const [open, setOpen] = useState(false)
  return (
    <Div className="flex flex-col items-center gap-3">
      <Button onClick={() => setOpen(true)}>Open AccountModalV2</Button>
      <AccountModalV2 open={open} onClose={() => setOpen(false)} />
    </Div>
  )
}
