'use client'

import { useState } from 'react'
import { ForgotPasswordModal } from '@ezstart/auth-sdk/components'
import { Button, Div } from '@ezstart/ui/components'
import { DemoSandbox } from './_lib/DemoSandbox'

export default function Demo() {
  const [open, setOpen] = useState(false)
  return (
    <DemoSandbox componentName="ForgotPasswordModal">
      <Div className="flex flex-col items-center gap-3">
        <Button onClick={() => setOpen(true)}>Open ForgotPasswordModal</Button>
        <ForgotPasswordModal isOpen={open} onClose={() => setOpen(false)} />
      </Div>
    </DemoSandbox>
  )
}
