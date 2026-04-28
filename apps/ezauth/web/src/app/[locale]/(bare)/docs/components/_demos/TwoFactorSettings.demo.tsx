'use client'

import { Placeholder } from './Placeholder'

export default function Demo() {
  return (
    <Placeholder
      name="TwoFactorSettings"
      reason="Requires an authenticated session to fetch the user's 2FA state. Sign in and visit /account to see this component live."
      cta={{ label: 'Open /account', href: '/account' }}
    />
  )
}
