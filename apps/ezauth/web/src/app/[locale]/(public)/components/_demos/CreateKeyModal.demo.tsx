'use client'

import { Placeholder } from './Placeholder'

export default function Demo() {
  return (
    <Placeholder
      name="CreateKeyModal"
      reason="Internal modal used by <DeveloperPortal>. Composes a complex form (name, scope, key type, application, quota) with full i18n texts. Open /developer when signed in to see it live in context."
      cta={{ label: 'Open /developer', href: '/developer' }}
    />
  )
}
