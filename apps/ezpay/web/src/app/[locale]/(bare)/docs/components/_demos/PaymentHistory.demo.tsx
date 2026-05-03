'use client'

import { PaymentHistory } from '@ezstart/pay-sdk/components'
import { Div, P } from '@ezstart/ui/components'
import { DemoSandbox } from './_lib/DemoSandbox'
import type { Payment } from '@ezstart/pay-sdk'

const NOW = Date.now()
const SAMPLE_PAYMENTS: Payment[] = [
  {
    id: 'pay_001',
    projectId: '_pay-docs-demo',
    projectName: 'Demo App',
    type: 'subscription',
    amount: 1900,
    currency: 'EUR',
    provider: 'stripe',
    paymentId: 'pi_demo_001',
    status: 'completed',
    isAnonymous: false,
    liveMode: false,
    metadata: { planName: 'Pro Monthly' },
    createdAt: new Date(NOW - 1000 * 60 * 60 * 24 * 2).toISOString(),
    updatedAt: new Date(NOW - 1000 * 60 * 60 * 24 * 2).toISOString(),
    completedAt: new Date(NOW - 1000 * 60 * 60 * 24 * 2).toISOString(),
  },
  {
    id: 'pay_002',
    projectId: '_pay-docs-demo',
    projectName: 'Demo App',
    type: 'donation',
    amount: 500,
    currency: 'EUR',
    provider: 'stripe',
    paymentId: 'pi_demo_002',
    status: 'completed',
    isAnonymous: true,
    liveMode: false,
    createdAt: new Date(NOW - 1000 * 60 * 60 * 24 * 6).toISOString(),
    updatedAt: new Date(NOW - 1000 * 60 * 60 * 24 * 6).toISOString(),
    completedAt: new Date(NOW - 1000 * 60 * 60 * 24 * 6).toISOString(),
  },
  {
    id: 'pay_003',
    projectId: '_pay-docs-demo',
    projectName: 'Demo App',
    type: 'purchase',
    amount: 2999,
    currency: 'EUR',
    provider: 'stripe',
    paymentId: 'pi_demo_003',
    status: 'refunded',
    isAnonymous: false,
    liveMode: false,
    metadata: { productName: 'Sticker Pack' },
    createdAt: new Date(NOW - 1000 * 60 * 60 * 24 * 14).toISOString(),
    updatedAt: new Date(NOW - 1000 * 60 * 60 * 24 * 13).toISOString(),
    completedAt: new Date(NOW - 1000 * 60 * 60 * 24 * 14).toISOString(),
  },
]

/**
 * Live preview for `<PaymentHistory>`. Pure presentation — receives a
 * `payments[]` array and renders the unified DataTable with type icons,
 * status badges, formatted dates and currency. No fetch, no hooks.
 */
export default function Demo() {
  return (
    <DemoSandbox componentName="PaymentHistory">
      <Div className="flex flex-col items-center gap-3 w-full">
        <PaymentHistory payments={SAMPLE_PAYMENTS} />
        <P className="text-xs text-muted-foreground text-center max-w-md">
          Pure presentation. Use `usePaymentHistory()` from `@ezstart/pay-sdk/react` to fetch the
          list, then pass the result via the `payments` prop.
        </P>
      </Div>
    </DemoSandbox>
  )
}
