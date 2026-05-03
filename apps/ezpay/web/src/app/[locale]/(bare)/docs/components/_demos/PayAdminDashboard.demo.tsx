'use client'

import { PayAdminDashboard } from '@ezstart/pay-sdk/components'
import { Div, P } from '@ezstart/ui/components'
import { DemoSandbox } from './_lib/DemoSandbox'

/**
 * Live preview for `<PayAdminDashboard>`. The component mounts 5 internal
 * tabs (Overview / Payments / Subscriptions / Plans / Promos) auto-scoped
 * via the bearer token. Without a superadmin JWT the analytics endpoints
 * return 401 and each tab gracefully renders its error/empty fallback —
 * still a meaningful preview of the tab chrome and layout.
 */
export default function Demo() {
  return (
    <DemoSandbox componentName="PayAdminDashboard">
      <Div className="flex flex-col items-center gap-3 w-full">
        <Div className="w-full max-w-4xl">
          <PayAdminDashboard />
        </Div>
        <P className="text-xs text-muted-foreground text-center max-w-md">
          Drop-in admin console — pass NO scoping props (no `appName`, no `applicationId`). The API
          auto-derives scope from the bearer (superadmin = all tenants, owner = own apps, user = own
          records).
        </P>
      </Div>
    </DemoSandbox>
  )
}
