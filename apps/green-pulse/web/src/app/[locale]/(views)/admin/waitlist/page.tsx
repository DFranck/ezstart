'use client'

import { Div, H1, P } from '@ezstart/ui/components'
import { WaitlistManagement } from '../components/WaitlistManagement'

export default function WaitlistPage() {
  return (
    <Div>
      <Div className="mb-6">
        <H1>Beta Waitlist</H1>
        <P className="text-muted-foreground mt-2">
          Approve or reject beta access requests for GreenPulse
        </P>
      </Div>

      <WaitlistManagement />
    </Div>
  )
}
