'use client'

import { ForgotPasswordCard } from '@ezstart/auth-sdk/components'

interface ForgotPasswordClientProps {
  ssrAppName: string | null
  ssrAppDisplayName: string | null
}

/**
 * Thin client wrapper around `<ForgotPasswordCard>` — forwards SSR-resolved
 * app slug for context. All chrome and form behaviour live in the SDK Card.
 */
export default function ForgotPasswordClient({ ssrAppName }: ForgotPasswordClientProps) {
  return <ForgotPasswordCard ssrAppName={ssrAppName} />
}
