'use client'

import { ConnectOnboardForm } from '@ezstart/pay-sdk/components'
import { Div, P } from '@ezstart/ui/components'
import { DemoSandbox } from './_lib/DemoSandbox'

/**
 * Live preview for `<ConnectOnboardForm>`. Renders the form for the
 * sandbox Application — `onSubmit` is a no-op so devs can fill the inputs
 * and click "Start Onboarding" without actually triggering a redirect to
 * Stripe's hosted onboarding URL.
 */
export default function Demo() {
  return (
    <DemoSandbox componentName="ConnectOnboardForm">
      <Div className="flex flex-col items-center gap-3 w-full max-w-md">
        <ConnectOnboardForm applicationId="_pay-docs-demo" onSubmit={() => undefined} />
        <P className="text-xs text-muted-foreground text-center max-w-md">
          Real apps wire `onSubmit` to `useConnectOnboard()` from `@ezstart/pay-sdk/react` — which
          calls the API and redirects to the Stripe-hosted onboarding URL.
        </P>
      </Div>
    </DemoSandbox>
  )
}
