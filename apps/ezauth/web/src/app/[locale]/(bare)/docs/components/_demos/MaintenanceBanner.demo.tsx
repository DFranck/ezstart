'use client'

import { MaintenanceBanner } from '@ezstart/auth-sdk/components'
import { Card, CardContent, Div, P } from '@ezstart/ui/components'

export default function Demo() {
  // The banner polls /api/maintenance-status and conditionally renders only
  // when maintenance is currently active. When maintenance is OFF (the
  // default), the live preview is intentionally empty — the explanatory card
  // below tells visitors what they're looking at.
  return (
    <Div className="w-full max-w-xl space-y-4">
      <MaintenanceBanner
        apiUrl={process.env.NEXT_PUBLIC_EZAUTH_API_URL ?? 'http://localhost:6110'}
      />
      <Card variant="default">
        <CardContent className="py-4 px-6">
          <P className="text-sm text-muted-foreground text-center">
            The banner is mounted live and currently polling /api/maintenance-status. It only
            renders content when an admin has toggled maintenance mode ON.
          </P>
        </CardContent>
      </Card>
    </Div>
  )
}
