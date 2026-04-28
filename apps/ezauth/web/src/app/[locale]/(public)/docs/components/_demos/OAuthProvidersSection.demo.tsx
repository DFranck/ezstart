'use client'

import { Placeholder } from './Placeholder'

export default function Demo() {
  return (
    <Placeholder
      name="OAuthProvidersSection"
      reason="Manages connected OAuth providers (Google, etc.) for the authenticated user. Visit /account when signed in."
      cta={{ label: 'Open /account', href: '/account' }}
    />
  )
}
