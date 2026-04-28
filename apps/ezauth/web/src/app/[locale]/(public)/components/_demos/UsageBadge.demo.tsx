'use client'

import { UsageBadge } from '@ezstart/auth-sdk/components'
import { Div } from '@ezstart/ui/components'

export default function Demo() {
  return (
    <Div className="flex flex-wrap items-center gap-3">
      <UsageBadge used={120} quota={1000} />
      <UsageBadge used={780} quota={1000} />
      <UsageBadge used={985} quota={1000} />
      <UsageBadge used={42} quota={null} />
    </Div>
  )
}
