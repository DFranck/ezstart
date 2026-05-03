'use client'

import { useState } from 'react'
import { PromoCodeInput } from '@ezstart/pay-sdk/components'
import { Div, P } from '@ezstart/ui/components'
import { DemoSandbox } from './_lib/DemoSandbox'

/**
 * Live preview for `<PromoCodeInput>`. Hooked to local state so the input
 * behaves like in a real checkout flow. Clicking "Apply" calls
 * `POST /api/promo-codes/validate` against the docs sandbox Application —
 * with no codes seeded the response is an "Invalid code" pill, which is the
 * intended visual to demonstrate the validation feedback.
 */
export default function Demo() {
  const [value, setValue] = useState('')
  return (
    <DemoSandbox componentName="PromoCodeInput">
      <Div className="flex flex-col items-center gap-3 w-full max-w-xs">
        <PromoCodeInput appName="_pay-docs-demo" value={value} onChange={setValue} />
        <P className="text-xs text-muted-foreground text-center max-w-xs">
          Type any code and click Apply. The SDK calls `validatePromo()` on the PayProvider client
          and renders a Valid / Invalid badge with the discount preview.
        </P>
      </Div>
    </DemoSandbox>
  )
}
