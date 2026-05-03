'use client'

import { ProductGrid } from '@ezstart/pay-sdk/components'
import { Div, P } from '@ezstart/ui/components'
import { DemoSandbox } from './_lib/DemoSandbox'

const DEMO_PRODUCTS = [
  {
    name: 'Sticker Pack',
    description: '48 high-res branded stickers.',
    price: 1999,
    currency: 'EUR',
    badge: 'Bestseller',
    priceId: 'price_demo_001',
    projectId: '_pay-docs-demo',
    type: 'purchase' as const,
  },
  {
    name: 'T-Shirt',
    description: 'Heavyweight cotton, organic dye.',
    price: 3499,
    currency: 'EUR',
    priceId: 'price_demo_002',
    projectId: '_pay-docs-demo',
    type: 'purchase' as const,
  },
  {
    name: 'Subscriber Mug',
    description: '12oz ceramic — limited edition.',
    price: 1499,
    currency: 'EUR',
    badge: 'New',
    priceId: 'price_demo_003',
    projectId: '_pay-docs-demo',
    type: 'purchase' as const,
  },
]

/**
 * Live preview for `<ProductGrid>` (deprecated pay-sdk wrapper). Renders
 * three sample products in a 3-column responsive grid using the legacy
 * `<ProductCard>` shape. New code should consume the `@ezstart/ui` grid +
 * pass `actionSlot` per product.
 */
export default function Demo() {
  return (
    <DemoSandbox componentName="ProductGrid">
      <Div className="flex flex-col items-center gap-3 w-full">
        <ProductGrid products={DEMO_PRODUCTS} columns={3} />
        <P className="text-xs text-muted-foreground text-center max-w-md">
          Pass `showFilters` to render the search + sort controls. `columns` controls the grid break
          (2 / 3 / 4).
        </P>
      </Div>
    </DemoSandbox>
  )
}
