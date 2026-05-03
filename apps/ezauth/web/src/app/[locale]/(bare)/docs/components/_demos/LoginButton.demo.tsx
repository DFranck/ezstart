'use client'

import { LoginButton } from '@ezstart/auth-sdk'
import { Div, P } from '@ezstart/ui/components'

export default function Demo() {
  return (
    <Div className="flex flex-col items-center gap-3">
      <Div className="flex flex-wrap gap-3 items-center">
        <LoginButton variant="default" />
        <LoginButton variant="outline" />
        <LoginButton variant="ghost" size="sm" />
      </Div>
      <P className="text-xs text-muted-foreground text-center max-w-xs">
        CTA that redirects to the EZAuth login page with the consumer&apos;s `redirect_uri` and
        theme preference. Toggles to a logout action when the visitor is signed in.
      </P>
    </Div>
  )
}
