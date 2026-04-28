'use client'

import { AuthErrorBanner } from '@ezstart/auth-sdk/components'
import { Div } from '@ezstart/ui/components'

export default function Demo() {
  return (
    <Div className="w-full max-w-md space-y-3">
      <AuthErrorBanner>Wrong email or password.</AuthErrorBanner>
      <AuthErrorBanner>Too many attempts. Try again in a minute.</AuthErrorBanner>
    </Div>
  )
}
