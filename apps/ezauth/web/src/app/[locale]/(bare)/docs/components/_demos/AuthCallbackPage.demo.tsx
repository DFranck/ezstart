'use client'

import { AuthCallbackPage } from '@ezstart/auth-sdk'
import { Div, P } from '@ezstart/ui/components'
import { DemoSandbox } from './_lib/DemoSandbox'

/**
 * Live preview for `<AuthCallbackPage>`. In production the page is mounted at
 * `/auth/callback` and consumes the `?code=...&state=...` query params from the
 * EZAuth redirect to exchange the authorization code for a session. Inside the
 * docs route there is no `?code=` param, so the page renders its `no-code`
 * error state — which is exactly what the consumer needs to preview to wire
 * the matching `noCodeMessage` text and `redirectTo` fallback.
 */
export default function Demo() {
  return (
    <DemoSandbox componentName="AuthCallbackPage">
      <Div className="w-full max-w-md flex flex-col items-center gap-3">
        <AuthCallbackPage noCodeMessage="No authorization code found in the URL." redirectTo="/" />
        <P className="text-xs text-muted-foreground text-center max-w-md">
          Mounted at `/auth/callback` in every consumer app to exchange the OAuth
          `?code=...&state=...` for a session. The preview renders the no-code error state because
          the docs page has no real authorization code.
        </P>
      </Div>
    </DemoSandbox>
  )
}
