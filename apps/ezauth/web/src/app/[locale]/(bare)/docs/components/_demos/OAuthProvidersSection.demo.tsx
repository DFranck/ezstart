'use client'

import { OAuthProvidersSection } from '@ezstart/auth-sdk/components'
import { Div } from '@ezstart/ui/components'
import { DemoSandbox } from './_lib/DemoSandbox'

export default function Demo() {
  return (
    <DemoSandbox componentName="OAuthProvidersSection">
      <Div className="w-full max-w-2xl">
        <OAuthProvidersSection />
      </Div>
    </DemoSandbox>
  )
}
