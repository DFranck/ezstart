'use client'

import { PricingPage } from '@ezstart/pay-sdk/components'
import { Div, P } from '@ezstart/ui/components'
import { DemoSandbox } from './_lib/DemoSandbox'

/**
 * Live preview for `<PricingPage>`. Auto-fetches plans for the docs sandbox
 * Application via `usePlans({ applicationId: '_pay-docs-demo' })` and
 * renders the full pricing grid with monthly/yearly toggle. If the seed
 * script has provisioned plans, devs see real cards; if not, the SDK
 * gracefully renders the `<PayNotConfiguredCard>` fallback.
 */
export default function Demo() {
  return (
    <DemoSandbox componentName="PricingPage">
      <Div className="flex flex-col items-center gap-3 w-full">
        <PricingPage applicationId="_pay-docs-demo" />
        <P className="text-xs text-muted-foreground text-center max-w-md">
          Pass `clientPlans` to prepend a Free tier without persisting it in the DB. Override
          `texts` for full i18n control. `featuredIndex` highlights the &quot;Most popular&quot;
          card.
        </P>
      </Div>
    </DemoSandbox>
  )
}
