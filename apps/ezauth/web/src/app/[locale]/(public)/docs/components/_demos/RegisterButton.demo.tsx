'use client'

import { RegisterButton } from '@ezstart/auth-sdk'
import { Div } from '@ezstart/ui/components'

export default function Demo() {
  return (
    <Div className="flex flex-wrap gap-3 items-center">
      <RegisterButton variant="default" />
      <RegisterButton variant="outline" />
      <RegisterButton variant="ghost" size="sm" />
    </Div>
  )
}
