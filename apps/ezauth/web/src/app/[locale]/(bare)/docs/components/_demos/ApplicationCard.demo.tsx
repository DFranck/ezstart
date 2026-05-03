'use client'

import { ApplicationCard } from '@ezstart/auth-sdk/components'
import type { Application } from '@ezstart/auth-sdk'
import { Div, P } from '@ezstart/ui/components'

const mockApp: Application = {
  id: 'demo-app-1',
  slug: 'acme-store',
  name: 'Acme Store',
  description: 'Primary production storefront.',
  ownerId: 'demo-owner-1',
  status: 'active',
  createdAt: '2026-01-15T10:00:00.000Z',
  updatedAt: '2026-04-20T16:30:00.000Z',
}

const mockArchived: Application = {
  ...mockApp,
  id: 'demo-app-2',
  slug: 'old-app',
  name: 'Legacy Service',
  status: 'archived',
}

export default function Demo() {
  return (
    <Div className="flex flex-col items-center gap-4 w-full max-w-3xl">
      <Div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
        <ApplicationCard application={mockApp} keyCount={4} onSelect={() => {}} />
        <ApplicationCard application={mockArchived} keyCount={0} onSelect={() => {}} />
      </Div>
      <P className="text-xs text-muted-foreground text-center max-w-md">
        Card summarising one Application — name, status badge, key count, and click target. Wire
        `onSelect` to navigate to the Application detail view.
      </P>
    </Div>
  )
}
