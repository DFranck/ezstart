'use client'

import { Placeholder } from './Placeholder'

export default function Demo() {
  return (
    <Placeholder
      name="UserSettings"
      reason="Full account settings panel — profile, security, sessions, OAuth, danger zone. Visit /account when signed in to see real data."
      cta={{ label: 'Open /account', href: '/account' }}
    />
  )
}
