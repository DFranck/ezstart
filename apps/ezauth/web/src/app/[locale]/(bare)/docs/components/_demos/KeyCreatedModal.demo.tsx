'use client'

import { Placeholder } from './Placeholder'

export default function Demo() {
  return (
    <Placeholder
      name="KeyCreatedModal"
      reason="One-time reveal modal shown after creating a new key. Uses the parent <DeveloperPortal> texts and copy-to-clipboard flow. Open /developer when signed in and create a key to see it live."
      cta={{ label: 'Open /developer', href: '/developer' }}
    />
  )
}
