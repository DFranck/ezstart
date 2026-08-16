'use client'

import { PastDueBanner } from '@ezstart/pay-sdk/components'
import { Card, CardContent, CardHeader, CardTitle, Div, Icon, P } from '@ezstart/ui/components'
import { DemoSandbox } from './_lib/DemoSandbox'

/**
 * Live preview for `<PastDueBanner>`. The component fetches the user's
 * subscriptions and only mounts when at least one is in `past_due`. The
 * docs sandbox has zero subscriptions in that state by design (no real
 * billing) so the live `<PastDueBanner>` returns `null`.
 *
 * To preserve the showcase value we render a faithful replica of the
 * destructive Card layout below — same icon, same copy template, same
 * CTA placement — alongside the live (empty) component so devs see what
 * they will get when a sub goes past_due.
 */
export default function Demo() {
  return (
    <DemoSandbox componentName="PastDueBanner">
      <Div className="flex flex-col items-center gap-3 w-full max-w-md">
        {/* Live SDK component — renders null in the sandbox. */}
        <PastDueBanner />

        {/* Visual stand-in: same shape as the SDK output when a past_due sub exists. */}
        <Card intent="destructive" className="w-full">
          <CardHeader>
            <Div className="flex items-center gap-2">
              <Icon name="lucide:CreditCard" className="h-5 w-5 text-destructive" />
              <CardTitle>Payment failed</CardTitle>
            </Div>
            <P className="text-sm text-muted-foreground">
              Your last Pro Monthly payment of €19.00 could not be processed. Update your payment
              method to keep your subscription active.
            </P>
          </CardHeader>
          <CardContent>
            <P className="text-sm">
              The real banner mounts a destructive Button wired to `onUpdatePayment` (or
              `actionHref` fallback).
            </P>
          </CardContent>
        </Card>
      </Div>
    </DemoSandbox>
  )
}
