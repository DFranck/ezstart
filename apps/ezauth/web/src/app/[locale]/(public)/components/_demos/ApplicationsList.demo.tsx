'use client'

import { Placeholder } from './Placeholder'

export default function Demo() {
  return (
    <Placeholder
      name="ApplicationsList"
      reason="Lists all applications owned by the authenticated user. Visit /dashboard/applications when signed in to see live data."
      cta={{ label: 'Open /dashboard', href: '/dashboard' }}
    />
  )
}
