'use client'

import { Placeholder } from './Placeholder'

export default function Demo() {
  return (
    <Placeholder
      name="ApplicationDetailView"
      reason="Detail view for a single Application — keys, theme, settings. Requires an authenticated session and an existing applicationId."
      cta={{ label: 'Open /dashboard', href: '/dashboard' }}
    />
  )
}
