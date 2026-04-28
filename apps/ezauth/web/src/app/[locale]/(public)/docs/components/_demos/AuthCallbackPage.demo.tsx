'use client'

import { Placeholder } from './Placeholder'

export default function Demo() {
  return (
    <Placeholder
      name="AuthCallbackPage"
      reason="Handles the OAuth code-exchange callback (?code=...&state=...). Mounted at /auth/callback in every consumer app — visit there at the end of an OAuth flow to see it live."
      cta={{ label: 'Read OAuth guide', href: '/docs' }}
    />
  )
}
