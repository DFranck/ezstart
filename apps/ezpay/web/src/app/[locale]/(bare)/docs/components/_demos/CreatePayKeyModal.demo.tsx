'use client'

import { useState } from 'react'
import { CreatePayKeyModal, defaultPayDeveloperPortalTexts } from '@ezstart/pay-sdk/components'
import { Button, Div, P } from '@ezstart/ui/components'
import { DemoSandbox } from './_lib/DemoSandbox'

/**
 * Live preview for `<CreatePayKeyModal>`. The modal overlays the viewport,
 * so the showcase wires it behind a trigger button. `onSubmit` is a no-op
 * — clicking Create simulates the form submission without actually
 * provisioning a key against the docs sandbox.
 */
export default function Demo() {
  const [open, setOpen] = useState(false)
  return (
    <DemoSandbox componentName="CreatePayKeyModal">
      <Div className="flex flex-col items-center gap-3">
        <Button onClick={() => setOpen(true)}>Create new EZPay key</Button>
        <CreatePayKeyModal
          isOpen={open}
          onClose={() => setOpen(false)}
          onSubmit={() => setOpen(false)}
          isSubmitting={false}
          texts={defaultPayDeveloperPortalTexts.create}
          applicationId="_pay-docs-demo"
        />
        <P className="text-xs text-muted-foreground text-center max-w-md">
          The modal collects name, type (publishable/secret), env (live/test), scope and expiry,
          then emits the validated request to the consumer via `onSubmit`. Set `showAdminScope` for
          superadmin-only flows.
        </P>
      </Div>
    </DemoSandbox>
  )
}
