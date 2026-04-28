'use client'

import { RequireAuthLoader } from '@ezstart/auth-sdk/components'
import { Card, CardContent, Div, P } from '@ezstart/ui/components'

export default function Demo() {
  // The component is fixed/inset by default — render in a relative card so
  // the showcase doesn't get covered.
  return (
    <Div className="relative w-full max-w-md h-64">
      <Card variant="default" className="h-full overflow-hidden">
        <CardContent className="relative h-full p-0">
          <RequireAuthLoader text="Authenticating…" backdrop={false} />
          <P className="absolute bottom-2 left-2 text-[10px] text-muted-foreground">
            Rendered inline (backdrop disabled)
          </P>
        </CardContent>
      </Card>
    </Div>
  )
}
