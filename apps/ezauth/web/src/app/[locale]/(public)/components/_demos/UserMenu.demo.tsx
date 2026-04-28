'use client'

import { Placeholder } from './Placeholder'

export default function Demo() {
  return (
    <Placeholder
      name="UserMenu"
      reason="Renders the authenticated user's dropdown menu in the app header. Sign in to see it live in the top-right of any page."
      cta={{ label: 'Sign in', href: '/login' }}
    />
  )
}
