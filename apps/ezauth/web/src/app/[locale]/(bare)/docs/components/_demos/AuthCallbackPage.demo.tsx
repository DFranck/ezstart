'use client'

import { Placeholder } from './Placeholder'

export default function Demo() {
  return (
    <Placeholder
      name="AuthCallbackPage"
      reason="Live preview unavailable: this page handles the OAuth code-exchange (?code=...&state=...) and is mounted at /auth/callback in every consumer app. Rendering it here would consume a real OAuth code. See the source for the full flow."
    />
  )
}
