'use client'

import { useState } from 'react'
import { ConfirmActionDialog } from '@ezstart/pay-sdk/components'
import { Button, Div, P } from '@ezstart/ui/components'
import { DemoSandbox } from './_lib/DemoSandbox'

/**
 * Live preview for `<ConfirmActionDialog>`. The dialog overlays the viewport
 * when `open=true`, so the showcase wires it behind a trigger button. The
 * `onConfirm` callback resolves a fake 800ms promise so devs can see the
 * built-in loading → success → auto-close transition without hitting an
 * API.
 */
export default function Demo() {
  const [open, setOpen] = useState(false)
  return (
    <DemoSandbox componentName="ConfirmActionDialog">
      <Div className="flex flex-col items-center gap-3">
        <Button variant="destructive" onClick={() => setOpen(true)}>
          Cancel my plan
        </Button>
        <ConfirmActionDialog
          open={open}
          onOpenChange={setOpen}
          title="Cancel subscription?"
          description="Your plan stays active until the end of the current billing period. You can resubscribe anytime."
          variant="destructive"
          onConfirm={async () => {
            await new Promise(resolve => setTimeout(resolve, 800))
          }}
        />
        <P className="text-xs text-muted-foreground text-center max-w-md">
          Built-in `confirm → loading → success → auto-close` lifecycle. Set `autoCloseDelay=0` to
          require a manual close, override `texts` to localize the labels.
        </P>
      </Div>
    </DemoSandbox>
  )
}
