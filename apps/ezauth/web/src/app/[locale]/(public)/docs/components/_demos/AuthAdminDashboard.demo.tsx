'use client'

import { Placeholder } from './Placeholder'

export default function Demo() {
  return (
    <Placeholder
      name="AuthAdminDashboard"
      reason="Federated admin dashboard. Requires superadmin scope and an authenticated session — visit /admin when signed in as a superadmin."
      cta={{ label: 'Open /admin', href: '/admin' }}
    />
  )
}
