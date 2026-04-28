'use client'

import { Placeholder } from './Placeholder'

export default function Demo() {
  return (
    <Placeholder
      name="AuditLogSection"
      reason="Lists audit events for the authenticated user. Visit /account/security when signed in to see real data."
      cta={{ label: 'Open /account', href: '/account' }}
    />
  )
}
