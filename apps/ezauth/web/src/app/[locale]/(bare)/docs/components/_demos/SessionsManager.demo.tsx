'use client'

import { Placeholder } from './Placeholder'

export default function Demo() {
  return (
    <Placeholder
      name="SessionsManager"
      reason="Renders the user's active sessions across devices. Requires an authenticated session — visit /account/sessions when signed in."
      cta={{ label: 'Open /account', href: '/account' }}
    />
  )
}
