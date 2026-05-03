'use client'

import { PayDeveloperPortal } from '@ezstart/pay-sdk/components'
import { Div, P } from '@ezstart/ui/components'
import { DemoSandbox } from './_lib/DemoSandbox'

/**
 * Live preview for `<PayDeveloperPortal>`. The portal calls `usePayKeys()`
 * scoped to the docs sandbox Application — without a signed-in developer
 * the table renders its empty-state with the &quot;Create New Key&quot;
 * CTA, faithfully showing the chrome devs will use to manage their EZPay
 * keys.
 */
export default function Demo() {
  return (
    <DemoSandbox componentName="PayDeveloperPortal">
      <Div className="flex flex-col items-center gap-3 w-full">
        <Div className="w-full max-w-3xl">
          <PayDeveloperPortal applicationId="_pay-docs-demo" />
        </Div>
        <P className="text-xs text-muted-foreground text-center max-w-md">
          Mirror of the auth-sdk DeveloperPortal — same table chrome, same modals, scoped to EZPay
          keys via the `useCreatePayKey` / `useRevokePayKey` / `useRotatePayKey` hooks.
        </P>
      </Div>
    </DemoSandbox>
  )
}
