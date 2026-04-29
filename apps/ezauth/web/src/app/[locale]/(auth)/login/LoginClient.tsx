'use client'

import { SignInCard } from '@ezstart/auth-sdk/components'

interface LoginClientProps {
  ssrAppName: string | null
  ssrAppDisplayName: string | null
}

export default function LoginClient({ ssrAppName, ssrAppDisplayName }: LoginClientProps) {
  return <SignInCard ssrAppName={ssrAppName} ssrAppDisplayName={ssrAppDisplayName} />
}
