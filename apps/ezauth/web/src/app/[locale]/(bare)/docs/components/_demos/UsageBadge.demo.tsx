'use client'

import { UsageBadge } from '@ezstart/auth-sdk/components'
import { Div, P } from '@ezstart/ui/components'

export default function Demo() {
  return (
    <Div className="flex flex-col items-center gap-3">
      <Div className="flex flex-wrap items-center gap-3">
        <UsageBadge used={120} quota={1000} />
        <UsageBadge used={780} quota={1000} />
        <UsageBadge used={985} quota={1000} />
        <UsageBadge used={42} quota={null} />
      </Div>
      <P className="text-xs text-muted-foreground text-center max-w-xs">
        Compact badge that switches color (default → warning → destructive) as usage approaches the
        quota. `quota={null}` renders the unlimited variant.
      </P>
    </Div>
  )
}
