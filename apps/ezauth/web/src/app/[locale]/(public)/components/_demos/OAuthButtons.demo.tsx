'use client'

import { OAuthButtons } from '@ezstart/auth-sdk/components'
import { Div } from '@ezstart/ui/components'

export default function Demo() {
  return (
    <Div className="w-full max-w-md">
      <OAuthButtons appName="ezauth" providers={['google']} />
    </Div>
  )
}
