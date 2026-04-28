'use client'

import { DevModeBanner } from '@ezstart/auth-sdk/components'
import { Div } from '@ezstart/ui/components'

export default function Demo() {
  return (
    <Div className="w-full max-w-2xl space-y-3">
      <DevModeBanner appName="ezauth" keyStatus="missing" />
      <DevModeBanner appName="ezauth" keyStatus="invalid" urlKey="ez_pk_test_invalid" />
      <DevModeBanner appName="ezauth" keyStatus="valid" urlKey="ez_pk_test_demo" />
    </Div>
  )
}
