'use client'

import { RegisterButton } from '@ezstart/auth-sdk'
import { Div, P } from '@ezstart/ui/components'

export default function Demo() {
  return (
    <Div className="flex flex-col items-center gap-3">
      <Div className="flex flex-wrap gap-3 items-center">
        <RegisterButton variant="default" />
        <RegisterButton variant="outline" />
        <RegisterButton variant="ghost" size="sm" />
      </Div>
      <P className="text-xs text-muted-foreground text-center max-w-xs">
        CTA that redirects to the EZAuth register page with the consumer&apos;s `redirect_uri` and
        theme preference. Hidden when the visitor is already authenticated.
      </P>
    </Div>
  )
}
