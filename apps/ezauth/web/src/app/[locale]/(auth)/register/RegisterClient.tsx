'use client'

import { SignUpCard } from '@ezstart/auth-sdk/components'

interface RegisterClientProps {
  ssrAppName: string | null
  ssrAppDisplayName: string | null
}

/**
 * Thin client wrapper around `<SignUpCard>` — forwards SSR-resolved brand
 * info from the server `page.tsx`. All chrome, key-config, OAuth, promo
 * codes, password strength, footer cross-link live in the SDK Card.
 */
export default function RegisterClient({ ssrAppName, ssrAppDisplayName }: RegisterClientProps) {
  return <SignUpCard ssrAppName={ssrAppName} ssrAppDisplayName={ssrAppDisplayName} />
}
