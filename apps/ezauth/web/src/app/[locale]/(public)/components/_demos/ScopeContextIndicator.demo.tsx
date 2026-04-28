'use client'

import { ScopeContextIndicator } from '@ezstart/auth-sdk/components'
import { Div } from '@ezstart/ui/components'

export default function Demo() {
  return (
    <Div className="flex flex-col gap-3 items-start">
      <ScopeContextIndicator scope="user" canSwitchToAdmin switchPath="/admin" />
      <ScopeContextIndicator scope="admin" canSwitchToAdmin switchPath="/dashboard" />
    </Div>
  )
}
