'use client'

import { Placeholder } from './Placeholder'

export default function Demo() {
  return (
    <Placeholder
      name="DeveloperPortal"
      reason="Full API-keys management portal. Requires an authenticated session — visit /developer when signed in to see live keys + usage."
      cta={{ label: 'Open /developer', href: '/developer' }}
    />
  )
}
