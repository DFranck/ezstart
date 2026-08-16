'use client'

import { Div, Icon, Input, P, SkeletonCard } from '@ezstart/ui/components'
import type {
  ProductGridFilterOptions as _ProductGridFilterOptions,
  ProductGridTexts as _ProductGridTexts,
} from '@ezstart/ui/components'
import { useDeprecationWarning } from '@ezstart/ui/hooks'
import { useMemo, useState } from 'react'
import { ProductCard, type ProductCardProps } from './ProductCard.js'

/**
 * @deprecated Moved to `@ezstart/ui` as a presentation-only `ProductGrid`.
 * Will be removed in 2026-08-01.
 */
export type ProductGridFilterOptions = _ProductGridFilterOptions
/**
 * @deprecated Moved to `@ezstart/ui` as `ProductGridTexts`. Will be removed
 * in 2026-08-01.
 */
export type ProductGridTexts = _ProductGridTexts

/**
 * @deprecated Moved to `@ezstart/ui` as `ProductGrid`. Will be removed in
 * 2026-08-01. The new UI primitive expects each `products[i]` to already
 * include an `actionSlot: ReactNode` (caller wires the action button).
 *
 * The pay-sdk wrapper preserves the legacy payment-shaped product props
 * (`priceId`, `projectId`, `type`, `userId`, ...) by rendering the deprecated
 * pay-sdk `<ProductCard>` for each item — which itself wires
 * `<PurchaseButton>` / `<SubscribeButton>` into `actionSlot`.
 */
export interface ProductGridProps {
  products: ProductCardProps[] | undefined
  columns?: 2 | 3 | 4
  showFilters?: boolean
  filterOptions?: ProductGridFilterOptions
  emptyMessage?: string
  className?: string
  texts?: ProductGridTexts
}

const GRID_COLS = {
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
} as const

/**
 * Backward-compat product grid that renders the legacy pay-sdk
 * `<ProductCard>` for each item.
 *
 * @deprecated Moved to `@ezstart/ui` as `ProductGrid`. Will be removed in
 * 2026-08-01. Migrate by mapping each product to include an `actionSlot`
 * and importing from `@ezstart/ui/components`.
 *
 * @example migration
 * ```tsx
 * // before
 * import { ProductGrid } from '@ezstart/pay-sdk/components'
 * <ProductGrid products={products} />
 *
 * // after
 * import { ProductGrid, Button } from '@ezstart/ui/components'
 * import { PurchaseButton } from '@ezstart/pay-sdk/components'
 * <ProductGrid
 *   products={products.map(p => ({
 *     ...p,
 *     actionSlot: (
 *       <PurchaseButton
 *         {...p}
 *         trigger={<Button className="w-full">Buy</Button>}
 *       />
 *     ),
 *   }))}
 * />
 * ```
 */
export function ProductGrid({
  products,
  columns = 3,
  showFilters = false,
  filterOptions = {},
  emptyMessage,
  className,
  texts,
}: ProductGridProps) {
  useDeprecationWarning(
    'ProductGrid from @ezstart/pay-sdk',
    'ProductGrid from @ezstart/ui/components (provide actionSlot per product)'
  )

  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'purchase' | 'subscription'>('all')

  const t = {
    emptyMessage: emptyMessage || texts?.emptyMessage || 'No products available.',
    searchPlaceholder: texts?.searchPlaceholder || 'Search products...',
    filterAll: texts?.filterAll || 'All',
    filterPurchase: texts?.filterPurchase || 'One-time',
    filterSubscription: texts?.filterSubscription || 'Subscription',
  }

  const filteredProducts = useMemo(() => {
    if (!products) return undefined
    let filtered = products
    if (typeFilter !== 'all') {
      filtered = filtered.filter(p => p.type === typeFilter)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      filtered = filtered.filter(
        p => p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q)
      )
    }
    return filtered
  }, [products, typeFilter, search])

  if (products === undefined) {
    return (
      <Div className={className}>
        <Div className={`grid ${GRID_COLS[columns]} gap-4`}>
          {Array.from({ length: columns }).map((_, i) => (
            <SkeletonCard key={i} showHeader showFooter lines={2} />
          ))}
        </Div>
      </Div>
    )
  }

  return (
    <Div className={`flex flex-col gap-4 ${className || ''}`}>
      {showFilters && (
        <Div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          {filterOptions.search !== false && (
            <Div className="w-full sm:w-64">
              <Input
                type="search"
                placeholder={t.searchPlaceholder}
                value={search}
                onChange={e => setSearch(e.target.value)}
                startIcon={<Icon name="lucide:Search" className="w-4 h-4" />}
              />
            </Div>
          )}
          {filterOptions.types !== false && (
            <Div className="flex gap-1 rounded-lg bg-muted p-1">
              {(['all', 'purchase', 'subscription'] as const).map(filterType => {
                const label =
                  filterType === 'all'
                    ? t.filterAll
                    : filterType === 'purchase'
                      ? t.filterPurchase
                      : t.filterSubscription
                return (
                  <button
                    key={filterType}
                    type="button"
                    onClick={() => setTypeFilter(filterType)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                      typeFilter === filterType
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {label}
                  </button>
                )
              })}
            </Div>
          )}
        </Div>
      )}

      {filteredProducts && filteredProducts.length > 0 ? (
        <Div className={`grid ${GRID_COLS[columns]} gap-4`}>
          {filteredProducts.map((product, index) => (
            <ProductCard key={`${product.priceId}-${index}`} {...product} />
          ))}
        </Div>
      ) : (
        <Div className="flex flex-col items-center justify-center gap-4 p-12 rounded-lg border-2 border-dashed border-muted-foreground/20">
          <Icon name="lucide:Package" className="w-12 h-12 text-muted-foreground/40" />
          <P className="text-muted-foreground text-center">{t.emptyMessage}</P>
        </Div>
      )}
    </Div>
  )
}

ProductGrid.displayName = 'ProductGrid'
