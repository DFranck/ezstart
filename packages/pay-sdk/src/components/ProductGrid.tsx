'use client'

import { Icon, Input, SkeletonCard } from '@ezstart/ui/components'
import { useMemo, useState } from 'react'
import { ProductCard, type ProductCardProps } from './ProductCard.js'

export interface ProductGridFilterOptions {
  types?: boolean
  priceRange?: boolean
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
  products: ProductCardProps[] | undefined
  columns?: 2 | 3 | 4
  showFilters?: boolean
  filterOptions?: ProductGridFilterOptions
  emptyMessage?: string
  className?: string
  texts?: ProductGridTexts
}

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
  const [typeFilter, setTypeFilter] = useState<'all' | 'purchase' | 'subscription'>('all')

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
      <div className={className}>
        <div className={`grid ${gridCols[columns]} gap-4`}>
          {Array.from({ length: columns }).map((_, i) => (
            <SkeletonCard key={i} showHeader showFooter lines={2} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={`flex flex-col gap-4 ${className || ''}`}>
      {/* Filters */}
      {showFilters && (
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          {/* Search */}
          {filterOptions.search !== false && (
            <div className="w-full sm:w-64">
              <Input
                type="search"
                placeholder={t.searchPlaceholder}
                value={search}
                onChange={e => setSearch(e.target.value)}
                startIcon={<Icon name="lucide:Search" className="w-4 h-4" />}
              />
            </div>
          )}

          {/* Type filter */}
          {filterOptions.types !== false && (
            <div className="flex gap-1 rounded-lg bg-muted p-1">
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
            </div>
          )}
        </div>
      )}

      {/* Grid or empty state */}
      {filteredProducts && filteredProducts.length > 0 ? (
        <div className={`grid ${gridCols[columns]} gap-4`}>
          {filteredProducts.map((product, index) => (
            <ProductCard key={`${product.priceId}-${index}`} {...product} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-4 p-12 rounded-lg border-2 border-dashed border-muted-foreground/20">
          <Icon name="lucide:Package" className="w-12 h-12 text-muted-foreground/40" />
          <p className="text-muted-foreground text-center">{t.emptyMessage}</p>
        </div>
      )}
    </div>
  )
}
