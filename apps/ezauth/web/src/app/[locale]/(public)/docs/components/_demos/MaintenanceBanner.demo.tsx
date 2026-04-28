'use client'

import { Placeholder } from './Placeholder'

export default function Demo() {
  return (
    <Placeholder
      name="MaintenanceBanner"
      reason="Polls /api/maintenance-status and renders only when maintenance is active. Toggle maintenance mode in /admin to see it live."
      cta={{ label: 'Open /admin', href: '/admin' }}
    />
  )
}
