'use client'

import { FeatureGate } from '@ezstart/pay-sdk/components'
import { Card, CardContent, Div, Icon, P, Span } from '@ezstart/ui/components'
import { DemoSandbox } from './_lib/DemoSandbox'

/**
 * Live preview for `<FeatureGate>`. With no signed-in user in the sandbox
 * the gate evaluates `features.includes('demo-feature')` to `false` and
 * renders the `fallback` — exactly what an upgrade CTA looks like in real
 * apps. The "unlocked" branch is shown side-by-side via the inverse
 * branch with a known feature name to illustrate the success path.
 */
export default function Demo() {
  return (
    <DemoSandbox componentName="FeatureGate">
      <Div className="flex flex-col items-center gap-4 w-full max-w-md">
        <FeatureGate
          feature="demo-feature"
          fallback={
            <Card variant="default" className="w-full">
              <CardContent className="py-4 px-5 flex items-center gap-3">
                <Icon name="lucide:Lock" className="w-4 h-4 text-muted-foreground" />
                <Span className="text-sm">This feature is locked — upgrade to unlock it.</Span>
              </CardContent>
            </Card>
          }
        >
          <Card variant="default" className="w-full">
            <CardContent className="py-4 px-5 flex items-center gap-3">
              <Icon name="lucide:Unlock" className="w-4 h-4 text-success" />
              <Span className="text-sm">Premium content visible to entitled users.</Span>
            </CardContent>
          </Card>
        </FeatureGate>
        <P className="text-xs text-muted-foreground text-center max-w-xs">
          The gate consumes `useSubscriptionStatus()` and renders `fallback` (or `null`) when the
          active plan doesn't include the feature flag.
        </P>
      </Div>
    </DemoSandbox>
  )
}
