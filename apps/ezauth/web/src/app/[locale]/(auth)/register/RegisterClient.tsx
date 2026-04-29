'use client'

import { SignUpCard } from '@ezstart/auth-sdk/components'

interface RegisterClientProps {
  ssrAppName: string | null
  ssrAppDisplayName: string | null
}

export default function RegisterClient({ ssrAppName, ssrAppDisplayName }: RegisterClientProps) {
  return <SignUpCard ssrAppName={ssrAppName} ssrAppDisplayName={ssrAppDisplayName} />
}
