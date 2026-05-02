/**
 * ProductGrid — public surface tests.
 *
 * Pin the contract for the responsive product grid exposed by
 * `@ezstart/ui/components`. Originally extracted from `@ezstart/pay-sdk`.
 */
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

vi.mock('next/image', () => ({
  default: ({ src, alt, ...rest }: { src: string; alt: string; [k: string]: unknown }) =>
    React.createElement('img', { src, alt, ...rest }),
}))

const { ProductGrid } = await import('../../../components/data-display/product-grid')

const baseProduct = {
  price: 10,
  currency: 'EUR',
  actionSlot: <button type="button">Buy</button>,
}

describe('ProductGrid', () => {
  it('renders skeleton state when products is undefined', () => {
    const { container } = render(<ProductGrid products={undefined} columns={3} />)
    // Skeleton cards have a specific border class.
    expect(container.querySelectorAll('.border-border').length).toBeGreaterThan(0)
  })

  it('renders empty state with default message when no products', () => {
    render(<ProductGrid products={[]} />)
    expect(screen.getByText('No products available.')).toBeInTheDocument()
  })

  it('renders empty state with custom emptyMessage', () => {
    render(<ProductGrid products={[]} emptyMessage="Nothing yet" />)
    expect(screen.getByText('Nothing yet')).toBeInTheDocument()
  })

  it('renders one ProductCard per product', () => {
    render(
      <ProductGrid
        products={[
          { ...baseProduct, name: 'Alpha' },
          { ...baseProduct, name: 'Beta' },
          { ...baseProduct, name: 'Gamma' },
        ]}
      />
    )
    expect(screen.getByText('Alpha')).toBeInTheDocument()
    expect(screen.getByText('Beta')).toBeInTheDocument()
    expect(screen.getByText('Gamma')).toBeInTheDocument()
  })

  it('renders search + type filter controls when showFilters=true', () => {
    render(<ProductGrid products={[{ ...baseProduct, name: 'Alpha' }]} showFilters />)
    expect(screen.getByPlaceholderText('Search products...')).toBeInTheDocument()
    expect(screen.getByText('All')).toBeInTheDocument()
    expect(screen.getByText('One-time')).toBeInTheDocument()
    expect(screen.getByText('Subscription')).toBeInTheDocument()
  })

  it('filters products by search term (case-insensitive on name)', () => {
    render(
      <ProductGrid
        products={[
          { ...baseProduct, name: 'Alpha' },
          { ...baseProduct, name: 'Beta' },
        ]}
        showFilters
      />
    )
    const search = screen.getByPlaceholderText('Search products...') as HTMLInputElement
    fireEvent.change(search, { target: { value: 'alp' } })
    expect(screen.getByText('Alpha')).toBeInTheDocument()
    expect(screen.queryByText('Beta')).not.toBeInTheDocument()
  })

  it('filters products by type', () => {
    render(
      <ProductGrid
        products={[
          { ...baseProduct, name: 'Alpha', type: 'purchase' as const },
          { ...baseProduct, name: 'Beta', type: 'subscription' as const, intervalCount: 1 },
        ]}
        showFilters
      />
    )
    fireEvent.click(screen.getByText('Subscription'))
    expect(screen.getByText('Beta')).toBeInTheDocument()
    expect(screen.queryByText('Alpha')).not.toBeInTheDocument()
  })

  it('applies the column count to the grid (3 columns by default)', () => {
    const { container } = render(
      <ProductGrid
        products={[
          { ...baseProduct, name: 'Alpha' },
          { ...baseProduct, name: 'Beta' },
        ]}
      />
    )
    const grid = container.querySelector('.lg\\:grid-cols-3')
    expect(grid).toBeInTheDocument()
  })

  it('respects custom column count', () => {
    const { container } = render(
      <ProductGrid products={[{ ...baseProduct, name: 'Alpha' }]} columns={4} />
    )
    expect(container.querySelector('.xl\\:grid-cols-4')).toBeInTheDocument()
  })
})
