'use client'

import { Placeholder } from './Placeholder'

export default function Demo() {
  return (
    <Placeholder
      name="EZAuthDashboard"
      reason="Full developer dashboard with sidebar + tabs. Requires an authenticated session — visit /dashboard when signed in."
      cta={{ label: 'Open /dashboard', href: '/dashboard' }}
    />
  )
}
