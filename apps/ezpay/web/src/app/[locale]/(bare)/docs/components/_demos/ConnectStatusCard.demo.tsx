'use client'

import { ConnectStatusCard } from '@ezstart/pay-sdk/components'
import { Div, P } from '@ezstart/ui/components'
import { DemoSandbox } from './_lib/DemoSandbox'
import type { ConnectedAccount } from '@ezstart/pay-sdk'

const SAMPLE_ACCOUNT: ConnectedAccount = {
  _id: 'demo_acct_001',
  applicationId: '_pay-docs-demo',
  isPlatformAccount: false,
  stripeAccountId: 'acct_1Demo000000000',
  email: 'demo@example.com',
  businessName: 'Demo Studio',
  accountType: 'express',
  status: 'active',
  chargesEnabled: true,
  payoutsEnabled: true,
  defaultFeePercent: 2.9,
  onboardedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
  createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString(),
}

/**
 * Live preview for `<ConnectStatusCard>`. Pure visual — no fetch, the card
 * receives a fully-shaped `ConnectedAccount` payload and renders the
 * status badge, business name, and dashboard / disconnect CTAs.
 */
export default function Demo() {
  return (
    <DemoSandbox componentName="ConnectStatusCard">
      <Div className="flex flex-col items-center gap-3 w-full max-w-md">
        <ConnectStatusCard
          account={SAMPLE_ACCOUNT}
          onOpenDashboard={() => undefined}
          onDisconnect={() => undefined}
        />
        <P className="text-xs text-muted-foreground text-center max-w-md">
          Swap `account.status` for `pending`, `restricted`, `disabled` to see the badge change.
          Pass `onResume` to surface the "Resume Stripe onboarding" CTA on pending rows &lt; 7 days
          old.
        </P>
      </Div>
    </DemoSandbox>
  )
}
