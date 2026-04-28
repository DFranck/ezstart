'use client'

import { LoginButton } from '@ezstart/auth-sdk'
import { Div } from '@ezstart/ui/components'

export default function Demo() {
  return (
    <Div className="flex flex-wrap gap-3 items-center">
      <LoginButton variant="default" />
      <LoginButton variant="outline" />
      <LoginButton variant="ghost" size="sm" />
    </Div>
  )
}
