/**
 * ProductCard — public surface tests.
 *
 * Pin the contract for the presentation-only product card exposed by
 * `@ezstart/ui/components`. Originally extracted from `@ezstart/pay-sdk` —
 * the action button is now caller-provided via the `actionSlot` prop, which
 * keeps the primitive zero-coupling to any payment SDK.
 */
import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

vi.mock('next/image', () => ({
  default: ({ src, alt, ...rest }: { src: string; alt: string; [k: string]: unknown }) =>
    React.createElement('img', { src, alt, ...rest }),
}))

const { ProductCard } = await import('../../../components/data-display/product-card')

describe('ProductCard', () => {
  it('renders name, price and currency', () => {
    render(
      <ProductCard
        name="Widget"
        price={10}
        currency="EUR"
        actionSlot={<button type="button">Buy</button>}
      />
    )
    expect(screen.getByText('Widget')).toBeInTheDocument()
    expect(screen.getByText('Buy')).toBeInTheDocument()
    // Default formatter renders "$10.00" for non-Intl currencies — Intl will
    // produce "€10.00" or "10,00 €" depending on locale; just check digits.
    expect(screen.getByText(/10/)).toBeInTheDocument()
  })

  it('renders subscription suffix /mo when type=subscription', () => {
    render(
      <ProductCard
        name="Pro"
        price={29}
        currency="USD"
        type="subscription"
        intervalCount={1}
        actionSlot={<button type="button">Subscribe</button>}
      />
    )
    expect(screen.getByText(/\/ mo/)).toBeInTheDocument()
  })

  it('renders /yr suffix when intervalCount=12', () => {
    render(
      <ProductCard
        name="Pro Annual"
        price={290}
        currency="USD"
        type="subscription"
        intervalCount={12}
        actionSlot={<button type="button">Subscribe</button>}
      />
    )
    expect(screen.getByText(/\/ yr/)).toBeInTheDocument()
  })

  it('renders the badge when provided', () => {
    render(
      <ProductCard
        name="Widget"
        price={10}
        badge="New!"
        actionSlot={<button type="button">Buy</button>}
      />
    )
    expect(screen.getByText('New!')).toBeInTheDocument()
  })

  it('renders the description when provided', () => {
    render(
      <ProductCard
        name="Widget"
        description="Best widget ever"
        price={10}
        actionSlot={<button type="button">Buy</button>}
      />
    )
    expect(screen.getByText('Best widget ever')).toBeInTheDocument()
  })

  it('renders the image when provided', () => {
    render(
      <ProductCard
        name="Widget"
        price={10}
        image="/widget.png"
        actionSlot={<button type="button">Buy</button>}
      />
    )
    const img = screen.getByAltText('Widget') as HTMLImageElement
    expect(img).toBeInTheDocument()
    expect(img.getAttribute('src')).toBe('/widget.png')
  })

  it('uses custom formatCurrency when provided', () => {
    const fmt = vi.fn(() => 'CUSTOM')
    render(
      <ProductCard
        name="Widget"
        price={10}
        currency="EUR"
        formatCurrency={fmt}
        actionSlot={<button type="button">Buy</button>}
      />
    )
    expect(fmt).toHaveBeenCalledWith(10, 'EUR')
    expect(screen.getByText('CUSTOM')).toBeInTheDocument()
  })

  it('renders the caller-provided actionSlot in the footer', () => {
    render(<ProductCard name="Widget" price={10} actionSlot={<a href="/contact">Contact us</a>} />)
    const link = screen.getByText('Contact us') as HTMLAnchorElement
    expect(link).toBeInTheDocument()
    expect(link.tagName).toBe('A')
    expect(link.getAttribute('href')).toBe('/contact')
  })
})
