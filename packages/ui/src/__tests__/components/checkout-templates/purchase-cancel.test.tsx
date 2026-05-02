/**
 * PurchaseCancelTemplate — drop-in purchase cancel landing.
 */
import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}))

const { PurchaseCancelTemplate } =
  await import('../../../components/checkout-templates/purchase-cancel')

describe('PurchaseCancelTemplate', () => {
  it('renders English defaults', () => {
    render(<PurchaseCancelTemplate />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Payment Cancelled')
    expect(screen.getByText(/Your payment was cancelled/)).toBeInTheDocument()
    expect(screen.getByText('Try Again')).toBeInTheDocument()
    expect(screen.getByText('Back to Home')).toBeInTheDocument()
    expect(screen.getByText('Need help?')).toBeInTheDocument()
  })

  it('uses custom hrefs', () => {
    const { container } = render(
      <PurchaseCancelTemplate tryAgainHref="/en/purchase" backHomeHref="/en" />
    )
    const links = Array.from(container.querySelectorAll('a')).map(a => a.getAttribute('href'))
    expect(links).toContain('/en/purchase')
    expect(links).toContain('/en')
  })

  it('overrides texts', () => {
    render(
      <PurchaseCancelTemplate
        texts={{
          title: 'Bye',
          description: 'See ya',
          primaryCtaLabel: 'Retry',
          secondaryCtaLabel: 'Home',
        }}
      />
    )
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Bye')
    expect(screen.getByText('See ya')).toBeInTheDocument()
    expect(screen.getByText('Retry')).toBeInTheDocument()
    expect(screen.getByText('Home')).toBeInTheDocument()
  })
})
