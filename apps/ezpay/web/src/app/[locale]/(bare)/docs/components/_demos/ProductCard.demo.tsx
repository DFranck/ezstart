'use client'

import { ProductCard } from '@ezstart/pay-sdk/components'
import { Div, P } from '@ezstart/ui/components'
import { DemoSandbox } from './_lib/DemoSandbox'

/**
 * Live preview for `<ProductCard>` (deprecated pay-sdk wrapper around the
 * `@ezstart/ui` ProductCard). Renders one purchasable item with embedded
 * `<PurchaseButton>` action wiring. The Buy button no-ops in the sandbox
 * (no real `priceId` provisioned).
 */
export default function Demo() {
  return (
    <DemoSandbox componentName="ProductCard">
      <Div className="flex flex-col items-center gap-3 w-full max-w-xs">
        <ProductCard
          name="Premium Sticker Pack"
          description="48 high-resolution branded stickers, ready to ship."
          price={2999}
          currency="EUR"
          badge="Bestseller"
          priceId="price_demo_001"
          projectId="_pay-docs-demo"
          type="purchase"
        />
        <P className="text-xs text-muted-foreground text-center max-w-xs">
          New code should import `ProductCard` from `@ezstart/ui/components` and pass a custom
          `actionSlot` (e.g. a `PurchaseButton`) — this pay-sdk wrapper kept for back-compat until
          2026-08-01.
        </P>
      </Div>
    </DemoSandbox>
  )
}
