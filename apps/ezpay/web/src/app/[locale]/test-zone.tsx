'use client'

import { Div, H2, H3, P } from '@ezstart/ui/components'
import { DonateModal, PurchaseButton } from '@ezstart/pay-sdk'

export function TestZone() {
  return (
    <Div className="mt-12 p-6 border-2 border-dashed border-yellow-500/50 rounded-lg bg-yellow-500/5">
      <Div className="mb-6">
        <H2 className="text-2xl font-semibold text-yellow-600 dark:text-yellow-400">
          Test Zone (Dev Only)
        </H2>
        <P className="text-sm text-muted-foreground mt-1">
          Live pay-sdk components connected to Stripe test mode
        </P>
      </Div>

      <Div className="grid md:grid-cols-3 gap-6">
        {/* Donation */}
        <Div className="p-4 border rounded-lg flex flex-col gap-3">
          <H3 className="text-lg font-semibold">Donation</H3>
          <P className="text-sm text-muted-foreground">DonateModal with preset amounts</P>
          <DonateModal
            projectId="ezpay"
            projectName="EZPay Development"
            amounts={[5, 10, 25, 50]}
            currency="EUR"
            currencySymbol="€"
          />
        </Div>

        {/* Purchase - Test Item */}
        <Div className="p-4 border rounded-lg flex flex-col gap-3">
          <H3 className="text-lg font-semibold">Purchase</H3>
          <P className="text-sm text-muted-foreground">Test Item — one-time payment</P>
          <PurchaseButton
            projectId="ezpay"
            productId="ezpay-test-item"
            productName="EZPay Test Item"
            amount={9.99}
            currency="EUR"
            currencySymbol="€"
            description="Test product for development"
          />
        </Div>

        {/* Purchase - Premium Pass */}
        <Div className="p-4 border rounded-lg flex flex-col gap-3">
          <H3 className="text-lg font-semibold">Premium Purchase</H3>
          <P className="text-sm text-muted-foreground">Premium Pass — one-time payment</P>
          <PurchaseButton
            projectId="ezpay"
            productId="ezpay-premium-pass"
            productName="EZPay Premium Pass"
            amount={24.99}
            currency="EUR"
            currencySymbol="€"
            description="Premium access pass for testing"
          />
        </Div>
      </Div>
    </Div>
  )
}
