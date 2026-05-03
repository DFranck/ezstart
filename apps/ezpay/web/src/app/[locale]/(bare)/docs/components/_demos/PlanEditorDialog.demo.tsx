'use client'

import { useState } from 'react'
import { PlanEditorDialog } from '@ezstart/pay-sdk/components'
import { Button, Div, P } from '@ezstart/ui/components'
import { DemoSandbox } from './_lib/DemoSandbox'

/**
 * Live preview for `<PlanEditorDialog>`. Modal overlays the viewport, so
 * the showcase wires it behind a trigger button. Submitting the form
 * attempts a real `createPlan` call — without an authenticated owner the
 * server returns 401 and the dialog surfaces the toast error, which is
 * itself a meaningful demonstration of the lifecycle.
 */
export default function Demo() {
  const [open, setOpen] = useState(false)
  return (
    <DemoSandbox componentName="PlanEditorDialog">
      <Div className="flex flex-col items-center gap-3">
        <Button onClick={() => setOpen(true)}>Open Plan Editor</Button>
        <PlanEditorDialog
          isOpen={open}
          onClose={() => setOpen(false)}
          applicationId="_pay-docs-demo"
        />
        <P className="text-xs text-muted-foreground text-center max-w-md">
          Pass `plan` to enter edit mode. The dialog submits to `PayClient.createPlan` /
          `updatePlan` — the backend syncs Stripe product + price, no client-side Stripe call.
        </P>
      </Div>
    </DemoSandbox>
  )
}
