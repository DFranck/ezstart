'use client'

import { Placeholder } from './Placeholder'

export default function Demo() {
  return (
    <Placeholder
      name="EmailVerificationStatus"
      reason="Requires an authenticated session to read the email verification state. Sign in and visit /account."
      cta={{ label: 'Open /account', href: '/account' }}
    />
  )
}
