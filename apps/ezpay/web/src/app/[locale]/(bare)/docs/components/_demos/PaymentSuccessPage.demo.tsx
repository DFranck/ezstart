'use client'

import { PaymentSuccessPage } from '@ezstart/pay-sdk/components'
import { Div, P } from '@ezstart/ui/components'
import { DemoSandbox } from './_lib/DemoSandbox'

/**
 * Live preview for `<PaymentSuccessPage>` (deprecated alias of
 * `<PaymentSuccessTemplate>` from `@ezstart/ui/components`). The component
 * is a full-screen route page that branches on `?session_id=` in the URL.
 * Without a session_id it renders the error-state with the &quot;Go
 * Back&quot; CTA — that branch IS the meaningful preview here.
 *
 * The component uses `min-h-screen` internally; we wrap it in a constrained
 * card so the showcase row stays inline.
 */
export default function Demo() {
  return (
    <DemoSandbox componentName="PaymentSuccessPage">
      <Div className="flex flex-col items-center gap-3 w-full max-w-md">
        <Div className="w-full border rounded-lg overflow-hidden bg-card [&_.min-h-screen]:min-h-[260px]">
          <PaymentSuccessPage fallbackHref="/en/docs/components" />
        </Div>
        <P className="text-xs text-muted-foreground text-center max-w-md">
          Drop on your Stripe Checkout `success_url`. Without `session_id` the page renders the
          error branch + a `Go Back` CTA. With session_id, it shows a success checkmark and
          auto-redirects after 2s.
        </P>
      </Div>
    </DemoSandbox>
  )
}
