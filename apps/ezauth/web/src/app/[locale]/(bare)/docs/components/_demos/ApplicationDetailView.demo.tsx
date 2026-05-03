'use client'

import { ApplicationDetailView } from '@ezstart/auth-sdk/components'
import { Div, P } from '@ezstart/ui/components'
import { DemoSandbox } from './_lib/DemoSandbox'

/**
 * Live preview for `<ApplicationDetailView>`. The component requires a real
 * `applicationId` to fetch from the API. We pass a sentinel id so the component
 * exercises its loading → error transition (the API responds 404), which is the
 * actual UX state the consumer needs to see.
 *
 * In production usage the `id` comes from the route param; see
 * `<ApplicationsList>` for the click-through flow.
 */
export default function Demo() {
  return (
    <DemoSandbox componentName="ApplicationDetailView">
      <Div className="w-full max-w-4xl flex flex-col items-center gap-3">
        <ApplicationDetailView applicationId="docs-demo-preview" />
        <P className="text-xs text-muted-foreground text-center max-w-md">
          Tabbed Application detail view: Keys, Settings, Theme, Webhooks. Requires a real
          `applicationId`; the demo uses a sentinel id so you can see the loading and not-found
          states. Open the ApplicationsList preview to navigate to a real Application.
        </P>
      </Div>
    </DemoSandbox>
  )
}
