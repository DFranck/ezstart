'use client'

import { Placeholder } from './Placeholder'

export default function Demo() {
  return (
    <Placeholder
      name="UserDashboard"
      reason="Compound user dashboard. Requires an authenticated session — visit /dashboard when signed in to see live data."
      cta={{ label: 'Open /dashboard', href: '/dashboard' }}
    />
  )
}
