'use client'

import { Placeholder } from './Placeholder'

export default function Demo() {
  return (
    <Placeholder
      name="UserMenuV2"
      reason="V2 dropdown — Stripe/Clerk parity. Sign in to see it live in the top-right of any page."
      cta={{ label: 'Sign in', href: '/login' }}
    />
  )
}
