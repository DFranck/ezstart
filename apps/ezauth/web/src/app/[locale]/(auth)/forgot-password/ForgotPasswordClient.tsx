'use client'

import { ForgotPasswordCard } from '@ezstart/auth-sdk/components'

interface ForgotPasswordClientProps {
  ssrAppName: string | null
  ssrAppDisplayName: string | null
}

export default function ForgotPasswordClient({ ssrAppName }: ForgotPasswordClientProps) {
  return <ForgotPasswordCard ssrAppName={ssrAppName} />
}
