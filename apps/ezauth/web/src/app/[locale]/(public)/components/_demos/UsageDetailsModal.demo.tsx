'use client'

import { Placeholder } from './Placeholder'

export default function Demo() {
  return (
    <Placeholder
      name="UsageDetailsModal"
      reason="Per-key usage detail modal — fetches /api/keys/:id/usage. Internal to <DeveloperPortal>. Click a key's Usage button at /developer when signed in to see it live."
      cta={{ label: 'Open /developer', href: '/developer' }}
    />
  )
}
