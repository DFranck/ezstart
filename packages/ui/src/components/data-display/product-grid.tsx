'use client'

import { useMemo, useState } from 'react'
import { Icon } from '../icon'
import { Input } from '../forms/input'
import { SkeletonCard } from '../feedback/skeleton'
import { Div, P } from '../tag'
import { ProductCard, type ProductCardProps, type ProductCardType } from './product-card'

export interface ProductGridFilterOptions {
  /** Show / hide the type filter (purchase / subscription / all). Default `true` (when `showFilters`). */
  types?: boolean
  /** Reserved for future price-range filter. */
  priceRange?: boolean
  /** Show / hide the search input. Default `true` (when `showFilters`). */
  search?: boolean
}

export interface ProductGridTexts {
  emptyMessage?: string
  searchPlaceholder?: string
  filterAll?: string
  filterPurchase?: string
  filterSubscription?: string
}

export interface ProductGridProps {
  /** Products to render. `undefined` triggers the loading skeleton state. */
  products: ProductCardProps[] | undefined
  /** Number of columns at desktop breakpoint. Defaults to `3`. */
  columns?: 2 | 3 | 4
  /** Show search + type filter controls above the grid. Default `false`. */
  showFilters?: boolean
  /** Granular filter visibility. Has effect only when `showFilters === true`. */
  filterOptions?: ProductGridFilterOptions
  /** Override default empty-state message. */
  emptyMessage?: string
  /** Extra Tailwind classes appended to the outer wrapper. */
  className?: string
  /** Override any text. English defaults are used when omitted. */
  texts?: ProductGridTexts
}

/**
 * Generic product grid — renders a responsive grid of `<ProductCard>`s with
 * optional search + type filter. Each `products[i]` MUST already include an
 * `actionSlot` (caller wires the button to its own purchase / subscribe /
 * routing logic).
 *
 * Originally `ProductGrid` from `@ezstart/pay-sdk`. The pay-sdk re-export
 * preserves backward compat by accepting the legacy payment-shaped props
 * and wiring `<PurchaseButton>` / `<SubscribeButton>` as the `actionSlot`.
 *
 * @example
 * ```tsx
 * import { ProductGrid, Button } from '@ezstart/ui/components'
 *
 * <ProductGrid
 *   columns={3}
 *   showFilters
 *   products={products.map(p => ({
 *     ...p,
 *     actionSlot: <Button className="w-full">Buy</Button>,
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
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | ProductCardType>('all')

  const t = {
    emptyMessage: emptyMessage || texts?.emptyMessage || 'No products available.',
    searchPlaceholder: texts?.searchPlaceholder || 'Search products...',
    filterAll: texts?.filterAll || 'All',
    filterPurchase: texts?.filterPurchase || 'One-time',
    filterSubscription: texts?.filterSubscription || 'Subscription',
  }

  const gridCols = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  }

  const filteredProducts = useMemo(() => {
    if (!products) return undefined

    let filtered = products

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(p => p.type === typeFilter)
    }

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase()
      filtered = filtered.filter(
        p => p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q)
      )
    }

    return filtered
  }, [products, typeFilter, search])

  // Loading state
  if (products === undefined) {
    return (
      <Div className={className}>
        <Div className={`grid ${gridCols[columns]} gap-4`}>
          {Array.from({ length: columns }).map((_, i) => (
            <SkeletonCard key={i} showHeader showFooter lines={2} />
          ))}
        </Div>
      </Div>
    )
  }

  return (
    <Div className={`flex flex-col gap-4 ${className || ''}`}>
      {/* Filters */}
      {showFilters && (
        <Div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          {/* Search */}
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

          {/* Type filter */}
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

      {/* Grid or empty state */}
      {filteredProducts && filteredProducts.length > 0 ? (
        <Div className={`grid ${gridCols[columns]} gap-4`}>
          {filteredProducts.map((product, index) => (
            <ProductCard key={`${product.name}-${index}`} {...product} />
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
