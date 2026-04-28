'use client'

import { useState } from 'react'
import { PasswordStrength } from '@ezstart/auth-sdk/components'
import { Div, Input, Label } from '@ezstart/ui/components'

export default function Demo() {
  const [pwd, setPwd] = useState('Password123!')
  return (
    <Div className="w-full max-w-md space-y-3">
      <Div className="space-y-2">
        <Label htmlFor="demo-pwd">Try typing a password</Label>
        <Input
          id="demo-pwd"
          type="text"
          value={pwd}
          onChange={e => setPwd(e.target.value)}
          placeholder="Type something..."
        />
      </Div>
      <PasswordStrength password={pwd} />
    </Div>
  )
}
